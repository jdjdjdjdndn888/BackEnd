local website = "https://api.gemtide.win"
local auth = "LoginToPs99BetFooorGemssz"

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
local speciesIdToName    = {}
local tradeId            = 0
local startTick          = tick()
local tradeUser          = nil
local goNext             = true
local gems = 0
local method = nil
local processingBackend = false
local activeTradeUsername = nil
local depositSeen = false
local depositSeenAt = 0
local depositSnapshotItems = {}
local depositSnapshotGems = 0
local depositSnapshotUserId = nil
local depositSnapshotUsername = nil
local depositCreditStarted = false

local function resetTradeState()
    tradeId = 0
    goNext = true
    gems = 0
    method = nil
    activeTradeUsername = nil
    depositSeen = false
    depositSeenAt = 0
    depositSnapshotItems = {}
    depositSnapshotGems = 0
    depositSnapshotUserId = nil
    depositSnapshotUsername = nil
    depositCreditStarted = false
    tradingItems = {}

    pcall(function()
        tradingMessage.Enabled = false
    end)

    pcall(function()
        tradingWindow.Visible = false
    end)
end


--// Initializing
print("[GemTide.Win Trade Bot] initializing variables...")
local request = request or http_request or (syn and syn.request) or (http and http.request) or (fluxus and fluxus.request)
local websocket = websocket or WebSocket
local getHwid = getuseridentifier or get_user_identifier or gethwid or get_hwid

local function safeRequest(data)
    if type(request) ~= "function" then
        warn("[GemTide.Win Trade Bot] request/http_request not found.")
        return nil
    end

    local ok, result = pcall(function()
        return request(data)
    end)

    if ok then
        return result
    end

    warn("[GemTide.Win Trade Bot] request failed: " .. tostring(result))
    return nil
end

local transactionConfirmationWebhook = "https://discord.com/api/webhooks/1525486529290567751/KBxTpZYFPt_66qi7xO6if-wA9BAQYf_HaefUC24bIbC6w45j8V_WwPm51b94dzaqaNlF"

local function findDiscordId(value, depth)
    depth = depth or 0
    if depth > 4 or type(value) ~= "table" then
        return nil
    end

    local keys = {
        "discordId", "discordID", "discord_id", "discordUserId",
        "discordUserID", "linkedDiscordId", "linked_discord_id"
    }

    for _, key in ipairs(keys) do
        local found = value[key]
        if found ~= nil then
            local id = tostring(found):match("%d+")
            if id then
                return id
            end
        end
    end

    for _, child in pairs(value) do
        if type(child) == "table" then
            local id = findDiscordId(child, depth + 1)
            if id then
                return id
            end
        end
    end

    return nil
end

local function sendDepositConfirmationWebhook(robloxUserId, robloxUsername, depositedItems, depositedGems, backendData)
    local discordId = findDiscordId(backendData)
    local displayUser = tostring(robloxUsername or robloxUserId or "Unknown")
    if discordId then
        displayUser = "<@" .. discordId .. ">"
    end

    local itemText = "None"
    if type(depositedItems) == "table" and #depositedItems > 0 then
        itemText = table.concat(depositedItems, ", ")
    end
    if #itemText > 1000 then
        itemText = string.sub(itemText, 1, 997) .. "..."
    end

    safeRequest({
        Url = transactionConfirmationWebhook,
        Method = "POST",
        Body = httpService:JSONEncode({
            ["username"] = "GemTide.Win Deposits",
            ["content"] = "**Deposit Confirmed**\n" ..
                "User: " .. displayUser .. "\n" ..
                "Roblox: " .. tostring(robloxUsername or "Unknown") .. " (" .. tostring(robloxUserId or "Unknown") .. ")\n" ..
                "Gems: " .. tostring(depositedGems or 0) .. "\n" ..
                "Items: " .. itemText
        }),
        Headers = {
            ["Content-Type"] = "application/json"
        }
    })
end

local function sendWithdrawConfirmationWebhook(robloxUserId, robloxUsername, withdrawnItems, withdrawnGems, backendData)
    local discordId = findDiscordId(backendData)
    local displayUser = tostring(robloxUsername or robloxUserId or "Unknown")
    if discordId then
        displayUser = "<@" .. discordId .. ">"
    end

    local itemText = "None"
    if type(withdrawnItems) == "table" and #withdrawnItems > 0 then
        itemText = table.concat(withdrawnItems, ", ")
    end
    if #itemText > 1000 then
        itemText = string.sub(itemText, 1, 997) .. "..."
    end

    safeRequest({
        Url = transactionConfirmationWebhook,
        Method = "POST",
        Body = httpService:JSONEncode({
            ["username"] = "GemTide.Win Transactions",
            ["content"] = "**Withdraw Confirmed**\n" ..
                "User: " .. displayUser .. "\n" ..
                "Roblox: " .. tostring(robloxUsername or "Unknown") .. " (" .. tostring(robloxUserId or "Unknown") .. ")\n" ..
                "Gems: " .. tostring(withdrawnGems or 0) .. "\n" ..
                "Items: " .. itemText
        }),
        Headers = {
            ["Content-Type"] = "application/json"
        }
    })
end

local function sendWebhookRaw(message)
    safeRequest({
        Url = "https://discord.com/api/webhooks/1523311031399747686/zhmAehXdSomBgJeuUCGJAmnmyojt7m3NsMt3MbcNhX6b3AtiC71PXuvuGoMa9GBAY3-5",
        Method = "POST",
        Body = httpService:JSONEncode({
            ["username"] = "GemTide.Win",
            ["content"] = "**GemTide.Win Trade Bot**\n" .. tostring(message)
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
print("[GemTide.Win Trade Bot] initializing functions...")

local function getHugesTitanics(hugesTitanicsIds)
    local hugesTitanics = {}
    local save = saveModule.Get()
    if not save or not save.Inventory or not save.Inventory.Pet then
        return hugesTitanics
    end

    for uuid, pet in next, save.Inventory.Pet do
        if table.find(hugesTitanicsIds, pet.id) then
            local petName = speciesIdToName[pet.id] or tostring(pet.id)
            table.insert(hugesTitanics, {
                ["uuid"]   = uuid,
                ["id"]     = petName,
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
    return (tradingCommands.GetState() and tradingCommands.GetState()._id) or 0
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

    -- Send message in Roblox game chat so the trading partner can see it
    pcall(function()
        local channels = textChatService:FindFirstChild("TextChannels")
        if channels then
            local general = channels:FindFirstChild("RBXGeneral")
                or channels:FindFirstChild("RBXSystem")
                or channels:FindFirstChildOfClass("TextChannel")
            if general then
                general:SendAsync("[GemTide.Win] " .. tostring(message))
            end
        end
    end)

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
        return true, "remove from trade : " .. table.concat(unsupported, ",")
    end

    return false, items
end

--// Misc Scripts
print("[GemTide.Win Trade Bot] initializing misc features...")

-- Strong anti-AFK. External auto-clickers do not always count as Roblox input,
-- so this also sends input from inside the client on a regular interval.
local antiAfkBusy = false
local function performAntiAfk()
    if antiAfkBusy then return end
    antiAfkBusy = true

    pcall(function()
        local camera = workspace.CurrentCamera
        local cameraCFrame = camera and camera.CFrame or CFrame.new()
        virtualUser:CaptureController()
        virtualUser:Button2Down(Vector2.new(0, 0), cameraCFrame)
        task.wait(0.15)
        virtualUser:Button2Up(Vector2.new(0, 0), cameraCFrame)
    end)

    -- Secondary input method for executors where VirtualUser alone is ignored.
    pcall(function()
        local virtualInputManager = game:GetService("VirtualInputManager")
        virtualInputManager:SendKeyEvent(true, Enum.KeyCode.LeftControl, false, game)
        task.wait(0.05)
        virtualInputManager:SendKeyEvent(false, Enum.KeyCode.LeftControl, false, game)
    end)

    antiAfkBusy = false
end

localPlayer.Idled:Connect(function()
    print("[GemTide.Win Trade Bot] Roblox idle event detected; sending anti-AFK input.")
    performAntiAfk()
end)

-- Do not wait for the 20-minute idle event. Keep activity alive continuously.
spawn(function()
    while task.wait(45) do
        performAntiAfk()
    end
end)

-- Log Roblox disconnect/error text so the cause can be identified if it still leaves.
pcall(function()
    local guiService = game:GetService("GuiService")
    guiService.ErrorMessageChanged:Connect(function(message)
        if message and tostring(message) ~= "" then
            local text = tostring(message)
            warn("[GemTide.Win Trade Bot] Roblox error/disconnect: " .. text)
            pcall(function()
                sendWebhookRaw("Roblox error/disconnect detected: " .. string.sub(text, 1, 1000))
            end)
        end
    end)
end)

--// Huges / Titanic detection
print("[GemTide.Win Trade Bot] initializing detections...")
local assetIds          = {}
local goldAssetids      = {}
local nameAssetIds      = {}
local hugesTitanicsIds  = {}

local function normalizeItemName(name)
    return string.lower(tostring(name or ""))
end

local function addSupportedVariant(name)
    if not name or name == "" then return end
    local variants = {
        name,
        "Golden " .. name,
        "Rainbow " .. name,
        "Shiny " .. name,
        "Shiny Golden " .. name,
        "Shiny Rainbow " .. name
    }
    for _, variant in ipairs(variants) do
        local n = normalizeItemName(variant)
        if n ~= "" and not table.find(supporteditems, n) then
            table.insert(supporteditems, n)
        end
    end
end

local function loadSupportedFromDirectory()
    -- Directory fallback should be the old supported list count, not backend + directory stacked together.
    supporteditems = {}
    local dirs = {
        replicatedStorage.__DIRECTORY.Pets.Huge,
        replicatedStorage.__DIRECTORY.Pets.Titanic
    }
    for _, dir in ipairs(dirs) do
        for _, pet in next, dir:GetChildren() do
            local ok, petData = pcall(require, pet)
            if ok and petData and petData.name then
                addSupportedVariant(petData.name)
            end
        end
    end
end

local lastSupportedReload = 0

local function GetSupported(silent)
    -- New GemTide.Win backend trade routes come from the working base:
    -- /trading/items/check-pending
    -- /trading/items/confirm-ps99-deposit
    -- /trading/items/confirm-withdraw
    -- For supported item names, first try the old item-list route if it exists,
    -- then always fall back to the real PS99 directory and build all Normal/Golden/Rainbow/Shiny variants.
    local loadedFromBackend = false
    local response = safeRequest({
        Url = website .. "/items/all",
        Method = "POST",
        Body = httpService:JSONEncode({
            ["game"] = "PS99",
            ["authKey"] = auth
        }),
        Headers = {
            ["Content-Type"] = "application/json",
            ["Authorization"] = auth
        }
    })

    supporteditems = {}
    if response and response.StatusCode == 200 and response.Body then
        local ok, body = pcall(function()
            return httpService:JSONDecode(tostring(response.Body))
        end)
        if ok and type(body) == "table" then
            local list = body.items or body.pets or body.data or body.result
            if type(list) == "table" then
                for _, item in ipairs(list) do
                    local rawName = nil
                    if type(item) == "string" then
                        rawName = item
                    elseif type(item) == "table" then
                        rawName = item.name or item.itemName or item.game_name or item.id
                    end

                    if rawName then
                        local n = normalizeItemName(rawName)
                        if n ~= "" and not table.find(supporteditems, n) then
                            table.insert(supporteditems, n)
                        end
                    end
                end
                loadedFromBackend = #supporteditems > 0
            end
        end
    end

    if #supporteditems == 0 then
        loadSupportedFromDirectory()
    end

    lastSupportedReload = tick()
    print("ITEMS LOADED: " .. tostring(#supporteditems) .. (loadedFromBackend and " backend" or " directory variants"))
    if not silent then
        pcall(function()
            sendWebhookRaw("ITEMS LOADED: " .. tostring(#supporteditems))
        end)
    end
end

local function rebuildPetDetectionData()
    assetIds = {}
    goldAssetids = {}
    nameAssetIds = {}
    hugesTitanicsIds = {}
    speciesIdToName = {}

    local dirs = {
        replicatedStorage.__DIRECTORY.Pets.Huge,
        replicatedStorage.__DIRECTORY.Pets.Titanic
    }

    for _, dir in ipairs(dirs) do
        for _, pet in next, dir:GetChildren() do
            local ok, petData = pcall(require, pet)
            if ok and petData and petData.name and petData._id then
                if petData.thumbnail then
                    table.insert(assetIds, petData.thumbnail)
                end
                if petData.goldenThumbnail then
                    table.insert(assetIds, petData.goldenThumbnail)
                    table.insert(goldAssetids, petData.goldenThumbnail)
                end
                table.insert(nameAssetIds, {
                    ["name"] = petData.name,
                    ["assetIds"] = {
                        petData.thumbnail,
                        petData.goldenThumbnail
                    }
                })
                table.insert(hugesTitanicsIds, petData._id)
                speciesIdToName[petData._id] = petData.name
            end
        end
    end
end

local function refreshSupportedNow(reason)
    pcall(rebuildPetDetectionData)
    pcall(function()
        GetSupported(true)
    end)
    if reason then
        print("[GemTide.Win Trade Bot] refreshed supported/database items: " .. tostring(reason) .. " | loaded=" .. tostring(#supporteditems) .. " | detected=" .. tostring(#hugesTitanicsIds))
    end
end

-- Huges / Titanics initial detection
rebuildPetDetectionData()

--// Trade ID setting
spawn(function()
    while task.wait(0.5) do
        tradeId = getTradeId()
    end
end)

--// Connection Functions
print("[GemTide.Win Trade Bot] initializing connects...")


local function confirmDepositToBackend(depositUserId, depositUsername, depositItems, depositGems)
    local lastStatus = "nil"
    local lastBody = "nil/no response"
    local depositedItems = {}
    local depositedItemObjects = {}

    depositUserId = depositUserId or tradeUser
    depositUsername = depositUsername or activeTradeUsername
    depositItems = depositItems or tradingItems
    depositGems = tonumber(depositGems) or tonumber(gems) or 0

    for _, itemName in ipairs(depositItems) do
        table.insert(depositedItems, tostring(itemName))
        table.insert(depositedItemObjects, {
            ["name"] = tostring(itemName),
            ["itemName"] = tostring(itemName),
            ["game_name"] = tostring(itemName),
            ["quantity"] = 1
        })
    end

    local depositPayload = {
        ["userId"] = tonumber(depositUserId) or depositUserId,
        ["userID"] = tostring(depositUserId),
        ["robloxUserId"] = tostring(depositUserId),
        ["robloxId"] = tostring(depositUserId),
        ["username"] = depositUsername,
        ["robloxUsername"] = depositUsername,
        ["items"] = depositedItems,
        ["itemNames"] = depositedItems,
        ["pets"] = depositedItems,
        ["itemData"] = depositedItemObjects,
        ["inventoryItems"] = depositedItemObjects,
        ["depositedItems"] = depositedItems,
        ["diamonds"] = depositGems,
        ["gems"] = depositGems,
        ["amount"] = depositGems,
        ["authKey"] = auth,
        ["game"] = "PS99"
    }

    for attempt = 1, 5 do
        local response = safeRequest({
            Url = website .. "/trading/items/confirm-ps99-deposit",
            Method = "POST",
            Body = httpService:JSONEncode(depositPayload),
            Headers = {
                ["Content-Type"] = "application/json",
                ["Authorization"] = auth,
                ["x-auth-key"] = auth
            }
        })

        lastStatus = response and tostring(response.StatusCode) or "nil"
        lastBody = response and tostring(response.Body) or "nil/no response"

        if response and response.StatusCode and response.StatusCode >= 200 and response.StatusCode < 300 then
            local ok, decoded = pcall(function()
                return httpService:JSONDecode(tostring(response.Body or "{}"))
            end)

            local backendRejected = ok and type(decoded) == "table" and (
                decoded.success == false or
                decoded.ok == false or
                decoded.error ~= nil
            )

            if not backendRejected then
                print("[GemTide.Win Trade Bot] deposit credited | userId=" .. tostring(depositUserId) .. " | items=" .. tostring(#depositedItems) .. " | gems=" .. tostring(depositGems))
                task.spawn(function()
                    pcall(function()
                        sendDepositConfirmationWebhook(depositUserId, depositUsername, depositedItems, depositGems, decoded)
                    end)
                end)
                return true
            end
        end

        print("[GemTide.Win Trade Bot] deposit credit retry " .. tostring(attempt) .. "/5 | userId=" .. tostring(depositUserId) .. " | status=" .. lastStatus .. " | body=" .. string.sub(lastBody, 1, 250))
        task.wait(2)
    end

    sendWebhookRaw("CRITICAL: Deposit completed but site credit failed. MANUAL CREDIT NEEDED | userId=" .. tostring(depositUserId) .. " | username=" .. tostring(depositUsername) .. " | pets=" .. table.concat(depositItems, ", ") .. " | gems=" .. tostring(depositGems) .. " | lastStatus=" .. lastStatus .. " | lastBody=" .. string.sub(lastBody, 1, 300))
    return false
end

local function sendBotStockSnapshot()
    local petInventory = getHugesTitanics(hugesTitanicsIds)
    local counts = {}
    local names = {}

    for _, pet in ipairs(petInventory) do
        local petString = (pet.shiny and "Shiny " or "") .. ((pet.type == "Golden" and "Golden ") or (pet.type == "Rainbow" and "Rainbow ") or "") .. tostring(pet.id)
        if not counts[petString] then
            counts[petString] = 0
            table.insert(names, petString)
        end
        counts[petString] = counts[petString] + 1
    end

    table.sort(names)

    local lines = {}
    table.insert(lines, "**Bot Stock Snapshot**")
    table.insert(lines, "Gems: " .. tostring(getDiamonds()))
    table.insert(lines, "Total Huges/Titanics: " .. tostring(#petInventory))
    table.insert(lines, "Items:")

    if #names == 0 then
        table.insert(lines, "None")
    else
        for _, name in ipairs(names) do
            table.insert(lines, tostring(counts[name]) .. "x " .. name)
        end
    end

    local message = table.concat(lines, "\n")
    if #message <= 1800 then
        sendWebhookRaw(message)
    else
        local chunk = "**Bot Stock Snapshot**\nGems: " .. tostring(getDiamonds()) .. "\nTotal Huges/Titanics: " .. tostring(#petInventory) .. "\nItems:\n"
        for _, name in ipairs(names) do
            local line = tostring(counts[name]) .. "x " .. name .. "\n"
            if #chunk + #line > 1800 then
                sendWebhookRaw(chunk)
                chunk = "**Bot Stock Snapshot Continued**\n"
            end
            chunk = chunk .. line
        end
        if #chunk > 0 then
            sendWebhookRaw(chunk)
        end
    end
end

local function connectMessage(localId, method, tradingItemsFunc)
    local messageConnection
    messageConnection = tradingMessage:GetPropertyChangedSignal("Enabled"):Connect(function()
        if tradingMessage.Enabled then
            local text = tradingMessage.Frame.Contents.Desc.Text

            local lowerText = string.lower(tostring(text))
            local completed = string.find(lowerText, "trade successfully completed", 1, true) ~= nil
                or string.find(lowerText, "trade completed", 1, true) ~= nil
                or string.find(lowerText, "trade success", 1, true) ~= nil
                or string.find(lowerText, "friend this player", 1, true) ~= nil

            if completed then
                processingBackend = true
                local completedUserId = tradeUser
                local completedUsername = activeTradeUsername
                local completedItems = {}
                for _, itemName in ipairs(tradingItems) do
                    table.insert(completedItems, itemName)
                end
                local completedGems = gems

                messageConnection:Disconnect()

                if method == "deposit" then
                    depositCreditStarted = true
                    if #completedItems == 0 and #depositSnapshotItems > 0 then completedItems = depositSnapshotItems end
                    if (tonumber(completedGems) or 0) == 0 and depositSnapshotGems > 0 then completedGems = depositSnapshotGems end
                    completedUserId = completedUserId or depositSnapshotUserId
                    completedUsername = completedUsername or depositSnapshotUsername
                    confirmDepositToBackend(completedUserId, completedUsername, completedItems, completedGems)
                else
                    local withdrawResponse = safeRequest({
                        Url = website .. "/trading/items/confirm-withdraw",
                        Method = "POST",
                        Body = httpService:JSONEncode({
                            ["userId"] = completedUserId,
                            ["userID"] = tostring(completedUserId),
                            ["robloxUserId"] = tostring(completedUserId),
                            ["username"] = completedUsername,
                            ["robloxUsername"] = completedUsername,
                            ["items"] = completedItems,
                            ["pets"] = completedItems,
                            ["diamonds"] = completedGems,
                            ["gems"] = completedGems,
                            ["authKey"] = auth,
                            ["game"] = "PS99"
                        }),
                        Headers = {
                            ["Content-Type"] = "application/json",
                            ["Authorization"] = auth,
                            ["x-auth-key"] = auth
                        }
                    })

                    local withdrawDecoded = nil
                    local withdrawConfirmed = false
                    if withdrawResponse and withdrawResponse.StatusCode and withdrawResponse.StatusCode >= 200 and withdrawResponse.StatusCode < 300 then
                        local decodeOk, decoded = pcall(function()
                            return httpService:JSONDecode(tostring(withdrawResponse.Body or "{}"))
                        end)
                        if decodeOk and type(decoded) == "table" then
                            withdrawDecoded = decoded
                        end

                        local backendRejected = withdrawDecoded and (
                            withdrawDecoded.success == false or
                            withdrawDecoded.ok == false or
                            withdrawDecoded.error ~= nil
                        )
                        withdrawConfirmed = not backendRejected
                    end

                    if withdrawConfirmed then
                        task.spawn(function()
                            pcall(function()
                                sendWithdrawConfirmationWebhook(completedUserId, completedUsername, completedItems, completedGems, withdrawDecoded)
                            end)
                        end)
                    else
                        sendWebhookRaw("CRITICAL: Withdraw completed in game but backend confirmation failed | userId=" .. tostring(completedUserId) .. " | username=" .. tostring(completedUsername) .. " | pets=" .. table.concat(completedItems, ", ") .. " | gems=" .. tostring(completedGems) .. " | status=" .. tostring(withdrawResponse and withdrawResponse.StatusCode or "nil") .. " | body=" .. string.sub(tostring(withdrawResponse and withdrawResponse.Body or "nil/no response"), 1, 300))
                    end
                end

                processingBackend = false
                task.wait(0.5)
                resetTradeState()

            elseif (string.find(text, " cancelled the trade!")) then
                sendMessage("Trade Declined")
                messageConnection:Disconnect()
                task.wait(1)
                resetTradeState()

            elseif string.find(text, "left the game") then
                sendMessage("Trade Declined")
                messageConnection:Disconnect()
                task.wait(1)
                resetTradeState()
            end
        end
    end)
end

local function connectStatus(localId, method)
    local statusConnection
    statusConnection = tradingStatus:GetPropertyChangedSignal("Visible"):Connect(function()
        if tradeId == localId then
            if tradingStatus.Visible then
                if method == "deposit" then
                    refreshSupportedNow("deposit status check")
                    local error, output = checkItems(assetIds, goldAssetids, nameAssetIds)
                    tradingItems = output
                    if error then
                        sendMessage(output)
                        task.wait(0.5)
                        pcall(declineTrade)
                        statusConnection:Disconnect()
                        task.wait(0.5)
                        resetTradeState()
                        return
                    elseif client_trade_gems_2() >= 1 and client_trade_gems_2() < 1000000 then
                        sendMessage("The min to deposit is 1 million gems!")
                    elseif client_trade_gems_2() > 10000000000 then
                        sendMessage("Please don't deposit more than 10 billion gems!")
                    elseif localPlayer.PlayerGui.TradeWindow.Frame.PlayerDiamonds.TextLabel.Text == "100B" then
                        sendMessage("i've reached the max gems. deposit rap.")
                    else
                        local rawGems = client_trade_gems_2() or 0
                        gems = math.floor(rawGems / 1000000) * 1000000
                        depositSeen = true
                        depositSeenAt = tick()
                        depositSnapshotItems = {}
                        for _, itemName in ipairs(tradingItems) do table.insert(depositSnapshotItems, itemName) end
                        depositSnapshotGems = gems
                        depositSnapshotUserId = tradeUser
                        depositSnapshotUsername = activeTradeUsername
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

spawn(function()
    local stuckTicks = 0
    while task.wait(1) do
        if goNext == false and getTradeId() == 0 and not processingBackend then
            stuckTicks = stuckTicks + 1

            -- PS99 may remove the trade ID before the completion popup appears.
            -- Never wipe a valid deposit; credit the saved snapshot instead.
            if method == "deposit" and depositSeen and not depositCreditStarted and tick() - depositSeenAt >= 3 then
                depositCreditStarted = true
                processingBackend = true
                confirmDepositToBackend(
                    depositSnapshotUserId,
                    depositSnapshotUsername,
                    depositSnapshotItems,
                    depositSnapshotGems
                )
                processingBackend = false
                task.wait(0.5)
                resetTradeState()
                stuckTicks = 0
            elseif method ~= "deposit" and stuckTicks >= 5 then
                print("[GemTide.Win Trade Bot] stale non-deposit trade state cleared.")
                resetTradeState()
                stuckTicks = 0
            end
        else
            stuckTicks = 0
        end
    end
end)

--// Main Script
print("[GemTide.Win Trade Bot] initializing main script...")
spawn(function()
    while task.wait(0.1) do
        local incomingTrades = getTrades()

        if #incomingTrades > 0 and goNext then
            local trade        = incomingTrades[1]
            local username     = trade.Name
            activeTradeUsername = username
            refreshSupportedNow("incoming trade from " .. tostring(username))
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

            if res ~= nil then
                local rawBody = tostring(res)
                local decodeOk, decoded = pcall(function()
                    return httpService:JSONDecode(rawBody)
                end)

                if decodeOk and type(decoded) == "table" and decoded["method"] ~= nil then
                    response = decoded
                else
                    sendMessage("Backend JSON decode failed for " .. username .. " | body=" .. string.sub(rawBody, 1, 300))
                end
            end

            if not response then
                local statusCode = pendingReq and tostring(pendingReq.StatusCode) or "nil"
                local rawBody = pendingReq and tostring(pendingReq.Body) or "nil/no response"
                sendMessage("Backend check failed for " .. username .. " | status=" .. statusCode .. " | body=" .. string.sub(rawBody, 1, 300))
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
                    resetTradeState()
                else

                refreshSupportedNow("accepted trade from " .. tostring(username))
                local localId  = getTradeId()
                tradeId        = localId
                method = response["method"]

                if response["method"] == "Withdraw" then
                    local withdrawData  = response["pets"] or {}
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
                            resetTradeState()
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
                            resetTradeState()
                        end
                    elseif #tradingItems ~= #withdrawData and not (response["gems"] and response["gems"] >= 1 and #withdrawData == 0) then
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
                    elseif #tradingItems == #withdrawData or (response["gems"] and response["gems"] >= 1 and #withdrawData == 0) then
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
                            resetTradeState()
                        end
                    end)
                    connectMessage(localId, "deposit", {})
                    connectStatus(localId, "deposit")
                    goNext = false
                end
                end
            end
        end
    end
end)

spawn(function()
    while task.wait(30) do
        refreshSupportedNow("periodic database reload")
    end
end)

spawn(function()
    while task.wait(300) do
        pcall(sendBotStockSnapshot)
    end
end)

spawn(function()
    task.wait(120)
    pcall(GetSupported)
end)

print("[GemTide.Win Trade Bot] script loaded in " .. tostring(tick() - startTick) .. "s")
sendWebhookRaw("Script loaded in " .. tostring(tick() - startTick) .. "s")
pcall(GetSupported)