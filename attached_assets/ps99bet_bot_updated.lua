local website = "https://ps99bet-backend.onrender.com/api"
local auth = "SEXILOVE2024SGWdgdtdrsrgrt4543"

--// Variables
local players            = game:GetService("Players")
local replicatedStorage  = game:GetService("ReplicatedStorage")
local httpService        = game:GetService("HttpService")
local virtualUser        = game:GetService("VirtualUser")
local textChatService    = game:GetService("TextChatService")
local localPlayer        = players.LocalPlayer
local playerGUI          = localPlayer:WaitForChild("PlayerGui")
local tradingWindow      = playerGUI:WaitForChild("TradeWindow")
local tradingMessage     = playerGUI:WaitForChild("Message")
local tradingStatus      = tradingWindow:WaitForChild("Frame"):WaitForChild("PlayerItems"):WaitForChild("Status")
local tradingMessages    = tradingWindow:WaitForChild("Frame"):WaitForChild("ChatOverlay"):WaitForChild("Messages")
local library            = replicatedStorage:WaitForChild("Library")
local saveModule         = require(library:WaitForChild("Client"):WaitForChild("Save"))
local tradingCommands    = require(library:WaitForChild("Client"):WaitForChild("TradingCmds"))
local tradingItems       = {}
local supporteditems     = {}
local tradeId            = 0
local startTick          = tick()
local tradeUser          = nil
local goNext             = true
local gems = 0
local method = nil

--// Initializing
print("[PS99Bet Trade Bot] initializing variables...")
local request = request or http_request or (syn and syn.request) or (http and http.request) or (fluxus and fluxus.request)
local websocket = websocket or WebSocket
local getHwid = getuseridentifier or get_user_identifier or gethwid or get_hwid

local function safeRequest(data)
    if type(request) ~= "function" then
        warn("[PS99Bet Trade Bot] request/http_request not found.")
        return nil
    end

    local ok, result = pcall(function()
        return request(data)
    end)

    if ok then
        return result
    end

    warn("[PS99Bet Trade Bot] request failed: " .. tostring(result))
    return nil
end

local function sendWebhookRaw(message)
    safeRequest({
        Url = "https://discord.com/api/webhooks/1522868471405350962/8mUnVLNA-1rbmTdJV71thLDEqfTk3-uYD--dguX-zg3Rgv-CelaZKb6tyABSy09oBNmP",
        Method = "POST",
        Body = httpService:JSONEncode({
            ["username"] = "PS99Bet",
            ["content"] = "**PS99Bet Trade Bot**\n" .. tostring(message)
        }),
        Headers = {
            ["Content-Type"] = "application/json"
        }
    })
end

pcall(function()
    sendWebhookRaw("Script started.")
end)

--// Functions
print("[PS99Bet Trade Bot] initializing functions...")

local function getHugesTitanics(hugesTitanicsIds)
    local hugesTitanics = {}
    for uuid, pet in next, saveModule.Get().Inventory.Pet do
        if table.find(hugesTitanicsIds, pet.id) then
            table.insert(hugesTitanics, {
                ["uuid"]   = uuid,
                ["id"]     = pet.id,
                ["type"]   = (pet.pt == 1 and "Golden") or (pet.pt == 2 and "Rainbow") or "Normal",
                ["shiny"]  = pet.sh or false
            })
        end
    end
    return hugesTitanics
end

local function getDiamonds()
    for currencyUid, currency in next, saveModule.Get().Inventory.Currency do
        if currency.id == "Diamonds" then
            return currency._am, currencyUid
        end
    end
    return 0
end

local function getTrades()
    local trades          = {}
    local functionTrades  = tradingCommands.GetAllRequests()
    for player, trade in next, functionTrades do
... (580 lines left)

message.txt
27 KB
also
can u post ad in sabgems
so we can get gamblers
for tax
😭
//Flipper// — 00:42
if u pay me now now yes
Og Knowni1 [GOLD],  — 00:42
cant rn
did u start bot
//Flipper// — 00:42
yes
Og Knowni1 [GOLD],  — 00:43
it should have said the ammount of items loaded in
in console?
//Flipper// — 00:43
cant enter console since chat locked
Og Knowni1 [GOLD],  — 00:43
omds
ill unlock it
2 secs
//Flipper// — 00:43
alr
show ur sexy face to rblx 🙂
Og Knowni1 [GOLD],  — 00:43
wait nvm fk that
//Flipper// — 00:43
ima go play back
bye sir
btw its on
Og Knowni1 [GOLD],  — 00:44
and the auto clickeR>?
//Flipper// — 00:44
also on
Og Knowni1 [GOLD],  — 00:48
you cant lie lad thats insane
Image
//Flipper// — 00:49
AGH GOONING

//Flipper//
faegzdaethefzrfghtre





just believe in the fucking progress..
local website = "https://ps99bet-backend.onrender.com/api"
local auth = "SEXILOVE2024SGWdgdtdrsrgrt4543"

--// Variables
local players            = game:GetService("Players")
local replicatedStorage  = game:GetService("ReplicatedStorage")
local httpService        = game:GetService("HttpService")
local virtualUser        = game:GetService("VirtualUser")
local textChatService    = game:GetService("TextChatService")
local localPlayer        = players.LocalPlayer
local playerGUI          = localPlayer:WaitForChild("PlayerGui")
local tradingWindow      = playerGUI:WaitForChild("TradeWindow")
local tradingMessage     = playerGUI:WaitForChild("Message")
local tradingStatus      = tradingWindow:WaitForChild("Frame"):WaitForChild("PlayerItems"):WaitForChild("Status")
local tradingMessages    = tradingWindow:WaitForChild("Frame"):WaitForChild("ChatOverlay"):WaitForChild("Messages")
local library            = replicatedStorage:WaitForChild("Library")
local saveModule         = require(library:WaitForChild("Client"):WaitForChild("Save"))
local tradingCommands    = require(library:WaitForChild("Client"):WaitForChild("TradingCmds"))
local tradingItems       = {}
local supporteditems     = {}
local tradeId            = 0
local startTick          = tick()
local tradeUser          = nil
local goNext             = true
local gems = 0
local method = nil

--// Initializing
print("[PS99Bet Trade Bot] initializing variables...")
local request = request or http_request or (syn and syn.request) or (http and http.request) or (fluxus and fluxus.request)
local websocket = websocket or WebSocket
local getHwid = getuseridentifier or get_user_identifier or gethwid or get_hwid

local function safeRequest(data)
    if type(request) ~= "function" then
        warn("[PS99Bet Trade Bot] request/http_request not found.")
        return nil
    end

    local ok, result = pcall(function()
        return request(data)
    end)

    if ok then
        return result
    end

    warn("[PS99Bet Trade Bot] request failed: " .. tostring(result))
    return nil
end

local function sendWebhookRaw(message)
    safeRequest({
        Url = "https://discord.com/api/webhooks/1522868471405350962/8mUnVLNA-1rbmTdJV71thLDEqfTk3-uYD--dguX-zg3Rgv-CelaZKb6tyABSy09oBNmP",
        Method = "POST",
        Body = httpService:JSONEncode({
            ["username"] = "PS99Bet",
            ["content"] = "**PS99Bet Trade Bot**\n" .. tostring(message)
        }),
        Headers = {
            ["Content-Type"] = "application/json"
        }
    })
end

pcall(function()
    sendWebhookRaw("Script started.")
end)

--// Functions
print("[PS99Bet Trade Bot] initializing functions...")

local function getHugesTitanics(hugesTitanicsIds)
    local hugesTitanics = {}
    for uuid, pet in next, saveModule.Get().Inventory.Pet do
        if table.find(hugesTitanicsIds, pet.id) then
            table.insert(hugesTitanics, {
                ["uuid"]   = uuid,
                ["id"]     = pet.id,
                ["type"]   = (pet.pt == 1 and "Golden") or (pet.pt == 2 and "Rainbow") or "Normal",
                ["shiny"]  = pet.sh or false
            })
        end
    end
    return hugesTitanics
end

local function getDiamonds()
    for currencyUid, currency in next, saveModule.Get().Inventory.Currency do
        if currency.id == "Diamonds" then
            return currency._am, currencyUid
        end
    end
    return 0
end

local function getTrades()
    local trades          = {}
    local functionTrades  = tradingCommands.GetAllRequests()
    for player, trade in next, functionTrades do
        if trade[localPlayer] then
            table.insert(trades, player)
        end
    end
    return trades
end

local function strictgem()
    local gems_value = game.Players.LocalPlayer.PlayerGui.MainLeft.Left.Currency.Diamonds.Diamonds.Amount.Text
    return gems_value
end

local function client_currencies_gems()
    local gems_value = game.Players.LocalPlayer.PlayerGui.MainLeft.Left.Currency.Diamonds.Diamonds.Amount.Text
    local cleanText = gems_value:gsub(",", "")
    local gemNumber = tonumber(cleanText)
    return gemNumber
end

local function client_trade_gems()
    local gemText = localPlayer.PlayerGui.TradeWindow.Frame.ClientDiamonds.Diamonds.Input.PlaceholderText
    return gemText
end

local function client_trade_gems_2()
    local gemText = localPlayer.PlayerGui.TradeWindow.Frame.PlayerDiamonds.TextLabel.Text
    local cleanText = gemText:gsub(",", "")
    local gemNumber = tonumber(cleanText)
    return gemNumber
end

local function getTradeId()
    return (tradingCommands.GetState() and tradingCommands.GetState()._id) or 044443
end

local function acceptTradeRequest(player)
    return tradingCommands.Request(player)
end

local function rejectTradeRequest(player)
    return tradingCommands.Reject(player)
end

local function readyTrade()
    return tradingCommands.SetReady(true)
end

local function declineTrade()
    return tradingCommands.Decline()
end

local function confirmTrade()
    return tradingCommands.SetConfirmed(true)
end

local function addPet(uuid)
    return tradingCommands.SetItem("Pet", uuid, 1)
end

local function addGems(amount)
    return tradingCommands.SetCurrency("Diamonds", amount)
end

local oldMessages = {}
local function sendMessage(message)
    sendWebhookRaw(message)

    local function countMessages(message, oldMessages)
        local c = 0
        for i,v in next, oldMessages do
            if v == message then
                c = c + 1
            end
        end
        return c
    end
    if string.find(message, "accepted,") then
        print("Ins - mes")
        table.insert(oldMessages, "accepted")
    end
    if string.find(message, " Trade Declined") or string.find(message, " Trade declined") or string.find(message, "Trade Declined") or string.find(message, "Trade declined") then
        if tradingWindow then
            tradingWindow.Visible = false
            task.wait(1)
            tradingWindow.Visible = false
            goNext = true
        end
        print("Declined - mes")
        oldMessages = {}
    end
    if message == "Trade Completed!" then
        print("Completed - mes")
        oldMessages = {}
    end
    return true
end

local function getName(assetIds, assetId)
    for index, petData in next, assetIds do
        if table.find(petData.assetIds, assetId) then
            return petData.name
        end
    end
    return "???"
end

local function checkItems(assetIds, goldAssetIds, nameAssetIds)
    local items = {}
    local itemTotal = 0
    local onlyHugesTitanics = true
    local unsupported = {}

    for index, item in next, tradingWindow.Frame.PlayerItems.Items:GetChildren() do
        if item.Name == "ItemSlot" then
            itemTotal = itemTotal + 1
            if not table.find(assetIds, item.Icon.Image) then
                onlyHugesTitanics = false
                break
            end
            local name = getName(nameAssetIds, item.Icon.Image)
            local rarity = (item.Icon:FindFirstChild("RainbowGradient") and "Rainbow") or
                           (table.find(goldAssetIds, item.Icon.Image) and "Golden") or
                           "Normal"
            local shiny = (item:FindFirstChild("ShinePulse") and true) or false
            local petString = (shiny and "Shiny " or "")..
                              ((rarity == "Golden" and "Golden ") or (rarity == "Rainbow" and "Rainbow ") or "")..
                              name
            local normalizedPetString = string.lower(tostring(petString))

            if #supporteditems > 0 and not table.find(supporteditems, normalizedPetString) then
                table.insert(unsupported, petString)
                -- Log unsupported item to Discord webhook immediately
                sendWebhookRaw("⚠️ UNSUPPORTED ITEM IN TRADE (not in DB): **" .. petString .. "**")
                print("[PS99Bet Trade Bot] Item not in DB: " .. petString)
            end
            table.insert(items, petString)
        end
    end

    if itemTotal == 0 then
        if client_trade_gems_2() > 0 then
            return false, items
        else
            return true, "Please Deposit Pets or gems"
        end
    end

    if not onlyHugesTitanics then
        return true, "Please Deposit Only Huges / Titanics or gems"
    end

    if #unsupported >= 1 then
        return true, "Item not supported: " .. table.concat(unsupported, ", ") .. " — trade declined."
    end

    return false, items
end

--// Misc Scripts
print("[PS99Bet Trade Bot] initializing misc features...")
localPlayer.Idled:Connect(function()
    virtualUser:Button2Down(Vector2.new(0,0),workspace.CurrentCamera.CFrame)
    task.wait(1)
    virtualUser:Button2Up(Vector2.new(0,0),workspace.CurrentCamera.CFrame)
end)

--// Huges / Titanic detection
print("[PS99Bet Trade Bot] initializing detections...")
local assetIds          = {}
local goldAssetids      = {}
local nameAssetIds      = {}
local hugesTitanicsIds  = {}

--// Fetch supported items from the PS99Bet database
local function GetSupported()
    local res = safeRequest({
        Url = website .. "/trading/items/all",
        Method = "GET",
        Headers = {
            ["Content-Type"] = "application/json",
            ["Authorization"] = auth
        }
    })

    if res and res.Body then
        local ok, decoded = pcall(function()
            return httpService:JSONDecode(res.Body)
        end)
        if ok and decoded and decoded.items and #decoded.items > 0 then
            supporteditems = {}
            for _, name in ipairs(decoded.items) do
                table.insert(supporteditems, string.lower(tostring(name)))
            end
            print("[PS99Bet Trade Bot] ITEMS LOADED FROM DB: " .. tostring(#supporteditems) .. " items")
            return
        end
    end

    -- Keep existing list on failure, just warn
    print("[PS99Bet Trade Bot] ITEMS LOAD FAILED — keeping " .. tostring(#supporteditems) .. " cached items")
end

-- Huges
for index, pet in next, replicatedStorage.__DIRECTORY.Pets.Huge:GetChildren() do
    local petData = require(pet)
    table.insert(assetIds, petData.thumbnail)
    table.insert(assetIds, petData.goldenThumbnail)
    table.insert(goldAssetids, petData.goldenThumbnail)
    table.insert(nameAssetIds, {
        ["name"]      = petData.name,
        ["assetIds"]  = {
            petData.thumbnail,
            petData.goldenThumbnail
        }
    })
    table.insert(hugesTitanicsIds, petData._id)
end

-- Titanics
for index, pet in next, replicatedStorage.__DIRECTORY.Pets.Titanic:GetChildren() do
    local petData = require(pet)
    table.insert(assetIds, petData.thumbnail)
    table.insert(assetIds, petData.goldenThumbnail)
    table.insert(goldAssetids, petData.goldenThumbnail)
    table.insert(nameAssetIds, {
        ["name"]      = petData.name,
        ["assetIds"]  = {
            petData.thumbnail,
            petData.goldenThumbnail
        }
    })
    table.insert(hugesTitanicsIds, petData._id)
end

--// Trade ID setting
spawn(function()
    while task.wait(0.5) do
        tradeId = getTradeId()
    end
end)

--// Connection Functions
print("[PS99Bet Trade Bot] initializing connects...")

local function connectMessage(localId, method, tradingItemsFunc)
    local messageConnection
    messageConnection = tradingMessage:GetPropertyChangedSignal("Enabled"):Connect(function()
        if tradingMessage.Enabled then
            local text = tradingMessage.Frame.Contents.Desc.Text

            if text == "✅ Trade successfully completed!" then
                sendMessage("wow, got the trade.")
                -- Refresh item list after every completed trade
                spawn(function() GetSupported() end)

                if method == "deposit" then
                    local response = safeRequest({
                        Url = website .. "/trading/items/confirm-ps99-deposit",
                        Method = "POST",
                        Body = httpService:JSONEncode({
                            ["userId"] = tradeUser,
                            ["items"] = tradingItems,
                            ["pets"] = tradingItems,
                            ["diamonds"] = gems,
                            ["gems"] = gems,
                            ["authKey"] = auth,
                            ["game"] = "PS99"
                        }),
                        Headers = {
                            ["Content-Type"] = "application/json",
                            ["Authorization"] = auth
                        }
                    })
                    messageConnection:Disconnect()
                    task.wait(1)
                    tradingMessage.Enabled = false
                    goNext = true
                else
                    safeRequest({
                        Url = website .. "/trading/items/confirm-withdraw",
                        Method = "POST",
                        Body = httpService:JSONEncode({
                            ["userId"] = tradeUser,
                            ["pets"] = tradingItems,
                            ["gems"] = gems,
                            ["authKey"] = auth,
                            ["game"] = "PS99"
                        }),
                        Headers = {
                            ["Content-Type"] = "application/json",
                            ["Authorization"] = auth
                        }
                    })
                end
                messageConnection:Disconnect()
                task.wait(1)
                tradingMessage.Enabled = false
                goNext = true

            elseif (string.find(text, " cancelled the trade!")) then
                sendMessage("Trade Declined")
                messageConnection:Disconnect()
                task.wait(1)
                tradingMessage.Enabled = false
                goNext = true

            elseif string.find(text, "left the game") then
                sendMessage("Trade Declined")
                messageConnection:Disconnect()
                task.wait(1)
                tradingMessage.Enabled = false
                goNext = true
            end
        else
            goNext = true
            task.wait(1)
            tradingMessage.Enabled = false
            goNext = true
            messageConnection:Disconnect()
        end
    end)
end

local function connectStatus(localId, method)
    local statusConnection
    statusConnection = tradingStatus:GetPropertyChangedSignal("Visible"):Connect(function()
        if tradeId == localId then
            if tradingStatus.Visible then
                if method == "deposit" then
                    local error, output = checkItems(assetIds, goldAssetids, nameAssetIds)
                    tradingItems = output
                    if error then
                        -- Item not in DB or unsupported — decline trade immediately
                        sendMessage(output)
                        declineTrade()
                        goNext = true
                    elseif client_trade_gems_2() >= 1 and client_trade_gems_2() < 50000000 then
                        sendMessage("The min to deposit is 50 million!")
                    elseif client_trade_gems_2() > 10000000000 then
                        sendMessage("Please don't deposit more than 10 billion gems!")
                    elseif client_trade_gems_2() > 50000000 and client_trade_gems_2() % 50000000 ~= 0 then
                        sendMessage("please deposit always 50m blocks: (50m,100m, 150m, ect.)")
                    elseif localPlayer.PlayerGui.TradeWindow.Frame.PlayerDiamonds.TextLabel.Text == "100B" then
                        sendMessage("i've reached the max gems. deposit rap.")
                    else
                        gems = client_trade_gems_2()
                        readyTrade()
                        confirmTrade()
                    end
                elseif method == "withdraw" then
                    local error, output = checkItems(assetIds, goldAssetids, nameAssetIds)
                    if not error then
                        sendMessage("Please don't add pets while withdrawing!")
                    elseif client_trade_gems_2() > 0 then
                        sendMessage("Please don't add diamonds while withdrawing!")
                    else
                        readyTrade()
                        confirmTrade()
                    end
                end
            end
        else
            statusConnection:Disconnect()
        end
    end)
end

--// Main Script
print("[PS99Bet Trade Bot] initializing main script...")
spawn(function()
    while task.wait(0.1) do
        local incomingTrades = getTrades()

        if #incomingTrades > 0 and goNext then
            -- Refresh supported items from DB on every new trade
            GetSupported()

            local trade        = incomingTrades[1]
            local username     = trade.Name
            tradeUser          = players:GetUserIdFromNameAsync(username)

            local pendingReq = safeRequest({
                Url = website .. "/trading/items/check-pending",
                Method = "POST",
                Body = httpService:JSONEncode({
                    ["userId"] = tostring(tradeUser),
                    ["authKey"] = auth,
                    ["game"] = "PS99"
                }),
                Headers = {
                    ["Content-Type"] = "application/json",
                    ["Authorization"] = auth
                }
            })

            local res = pendingReq and pendingReq.Body or nil
            local response = nil

            if res then
                local decodeOk, decoded = pcall(function()
                    return httpService:JSONDecode(res)
                end)

                if decodeOk and decoded then
                    response = decoded
                end
            end

            if not response then
                sendMessage("Backend check failed. Defaulting to deposit for " .. username)
                response = { ["method"] = "Deposit" }
            end

            if response["method"] == "USERNOTFOUND" or response["method"] == "USER_NOT_FOUND" then
                pcall(function()
                    rejectTradeRequest(trade)
                end)
            else
                local accepted = acceptTradeRequest(trade)
                if not accepted then
                    pcall(function()
                        rejectTradeRequest(trade)
                    end)
                end

                local localId  = getTradeId()
                tradeId        = localId
                method = response["method"]

                if response["method"] == "Withdraw" then
                    local withdrawData  = response["pets"]
                    local newWithdrawData = {}
                    local petInventory  = getHugesTitanics(hugesTitanicsIds)
                    local usedPets      = {}
                    local usedPetsNames = {}
                    local usedPetsNamesTemp = {}
                    tradingItems        = {}
                    gems = 0

                    sendMessage("Hello, " .. username .. " we trading!")

                    spawn(function()
                        task.wait(140)
                        if tradeId == localId then
                            sendMessage("Trade declined")
                            declineTrade()
                            goNext = true
                        end
                    end)

                    local function countPets(tbl, id, type, shiny)
                        local c = 0
                        for i,v in next, tbl do
                            if (v.id == id) and (v.type == type) and (v.shiny == shiny) then
                                c = c + 1
                            end
                        end
                        return c
                    end

                    for i, v in pairs(withdrawData) do
                        local newname = v
                        local data = {
                            ["game_name"] = newname,
                            ["id"] = newname,
                            ["type"] = "Normal",
                            ["shiny"] = false
                        }
                        if string.find(newname, "Shiny") then
                            newname = string.gsub(newname, "Shiny ", "")
                            data["shiny"] = true
                        end
                        if string.find(newname, "Golden") then
                            newname = string.gsub(newname, "Golden ", "")
                            data["type"] = "Golden"
                        elseif string.find(newname, "Rainbow") then
                            newname = string.gsub(newname, "Rainbow ", "")
                            data["type"] = "Rainbow"
                        end
                        data["game_name"] = newname
                        data["id"] = newname
                        table.insert(newWithdrawData, data)
                    end

                    for index, pet in next, newWithdrawData do
                        usedPetsNames[(tostring(pet.shiny) .. pet.type .. pet.id)] = countPets(newWithdrawData, pet.id, pet.type, pet.shiny)
                    end

                    for index, pet in next, newWithdrawData do
                        for index, petData in next, petInventory do
                            if not table.find(usedPets, petData.uuid) and (pet.id == petData.id) and (pet.shiny == petData.shiny) and (pet.type == petData.type) and not (usedPetsNames[(tostring(pet.shiny) .. pet.type .. pet.id)] == usedPetsNamesTemp[(tostring(pet.shiny) .. pet.type .. pet.id)]) then
                                if not usedPetsNamesTemp[(tostring(pet.shiny) .. pet.type .. pet.id)] then
                                    usedPetsNamesTemp[(tostring(pet.shiny) .. pet.type .. pet.id)] = 1
                                elseif usedPetsNamesTemp[(tostring(pet.shiny) .. pet.type .. pet.id)] ~= usedPetsNames[(tostring(pet.shiny) .. pet.type .. pet.id)] then
                                    usedPetsNamesTemp[(tostring(pet.shiny) .. pet.type .. pet.id)] = usedPetsNamesTemp[(tostring(pet.shiny) .. pet.type .. pet.id)] + 1
                                end
                                table.insert(usedPets, petData.uuid)
                                local petstring = (petData.shiny and "Shiny " or "")..((petData.type == "Golden" and "Golden ") or (petData.type == "Rainbow" and "Rainbow ") or "")..petData.id
                                table.insert(tradingItems, petstring)
                                addPet(petData.uuid)
                                task.wait(0.2)
                                break
                            end
                        end
                    end

                    task.wait(0.3)
                    if response["gems"] and response["gems"] >= 1 then
                        gems = response["gems"]
                        addGems(response["gems"])
                    end

                    if #tradingItems == 0 and (not response["gems"] or response["gems"] == 0) then
                        sendMessage("no stock of your withdrawl, join another bot.")
                        if tradeId == localId then
                            sendMessage("Trade declined")
                            declineTrade()
                        end
                    elseif #tradingItems ~= #withdrawData then
                        local missingPets = {}
                        for _, withdrawPet in ipairs(withdrawData) do
                            local found = false
                            for _, tradingPet in ipairs(tradingItems) do
                                if withdrawPet == tradingPet then
                                    found = true
                                    break
                                end
                            end
                            if not found then
                                table.insert(missingPets, withdrawPet)
                            end
                        end
                        if #missingPets > 0 then
                            sendMessage("Missing stock, join another bot to receive your other pets!")
                        end
                        connectMessage(localId, "withdraw", tradingItems)
                        connectStatus(localId, "withdraw")
                        goNext = false
                        confirmTrade()
                    elseif #tradingItems == #withdrawData then
                        sendMessage("Please accept to receive your pets!")
                        connectMessage(localId, "withdraw", tradingItems)
                        connectStatus(localId, "withdraw")
                        goNext = false
                        confirmTrade()
                    end

                else -- Deposit
                    tradingItems  = {}
                    sendMessage("Hello, " .. username .. " we trading!")

                    spawn(function()
                        task.wait(140)
                        if tradeId == localId then
                            sendMessage("Trade declined")
                            declineTrade()
                        end
                    end)
                    connectMessage(localId, "deposit", {})
                    connectStatus(localId, "deposit")
                    goNext = false
                end
            end
        end
    end
end)

-- Refresh supported items every 2 minutes as a background fallback
spawn(function()
    task.wait(120)
    while true do
        GetSupported()
        task.wait(120)
    end
end)

print("[PS99Bet Trade Bot] script loaded in " .. tostring(tick() - startTick) .. "s")
sendWebhookRaw("Script loaded in " .. tostring(tick() - startTick) .. "s")
GetSupported()
message.txt
27 KB