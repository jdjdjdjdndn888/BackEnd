local website = "https://ps99bet-backend.onrender.com"
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

local library            = replicatedStorage:WaitForChild("Library")
local saveModule         = require(library:WaitForChild("Client"):WaitForChild("Save"))
local tradingCommands    = require(library:WaitForChild("Client"):WaitForChild("TradingCmds"))
local tradingItems       = {}
local supporteditems     = {}
-- maps numeric species ID → display name; populated after Huge/Titanic loops
-- declared here (before getHugesTitanics) so the function can close over it
local speciesIdToName    = {}

local tradeId            = 0
local startTick          = tick()

local tradeUser          = nil
local goNext             = true

local gems = 0

local method = nil

--// Initializing
print("[SPIN Trade Bot] initializing variables...")

local request = request or http_request or (http and http.request)
local websocket = websocket or WebSocket
local getHwid = getuseridentifier or get_user_identifier or gethwid or get_hwid

--// Functions
print("[SPIN Trade Bot] initializing functions...")

-- Gets the user's pets in their inventory
local function getHugesTitanics(hugesTitanicsIds)
	local hugesTitanics = {}
	
	for uuid, pet in next, saveModule.Get().Inventory.Pet do
		if table.find(hugesTitanicsIds, pet.id) then
			-- Use display name (e.g. "Huge Cat") so it matches withdrawal data from the API
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

-- Gets the user's diamonds
local function getDiamonds()
	for currencyUid, currency in next, saveModule.Get().Inventory.Currency do
		if currency.id == "Diamonds" then
			return currency._am, currencyUid
		end
	end
	
	return 0
end

-- Gets all new trade requests
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



local function strictgem() -- Gets Player Gems clean.
    local gems_value = game.Players.LocalPlayer.PlayerGui.MainLeft.Left.Currency.Diamonds.Diamonds.Amount.Text
    return gems_value
  end
  local function client_currencies_gems() -- Fetches the gems from the player's GUI and not recommend using this for looking/comparing stats.
    local gems_value = game.Players.LocalPlayer.PlayerGui.MainLeft.Left.Currency.Diamonds.Diamonds.Amount.Text -- retry fixed
    local cleanText = gems_value:gsub(",", "")
    local gemNumber = tonumber(cleanText)
    return gemNumber
  end
  
  local function client_trade_gems() -- You/Bot gems.
    local gemText = localPlayer.PlayerGui.TradeWindow.Frame.ClientDiamonds.Diamonds.Input.PlaceholderText
    return gemText
  end
  local function client_trade_gems_2() --client_trade_gems_2 other player
    local gemText = localPlayer.PlayerGui.TradeWindow.Frame.PlayerDiamonds.TextLabel.Text
    local cleanText = gemText:gsub(",", "")
    local gemNumber = tonumber(cleanText)
    return gemNumber
  end

-- Returns 0 if your not in a trade
local function getTradeId()
	return (tradingCommands.GetState() and tradingCommands.GetState()._id) or 044443
end
-- Accept trade request
local function acceptTradeRequest(player)
	return tradingCommands.Request(player)
end
-- Reject trade request
local function rejectTradeRequest(player)
	return tradingCommands.Reject(player)
end
-- Readys the actual trade
local function readyTrade()
	return tradingCommands.SetReady(true)
end
-- Declines the actual trade
local function declineTrade()
	return tradingCommands.Decline()
end

local function confirmTrade()
    return tradingCommands.SetConfirmed(true) 
end

-- Dismisses the "X cancelled the trade!" / "Trade complete!" Ok popup.
-- No Visible check — parent frames can block that property even when dialog renders.
local function dismissTradeDialog()
    task.spawn(function()
        local deadline = tick() + 4
        while tick() < deadline do
            local ok = nil
            for _, desc in ipairs(localPlayer.PlayerGui:GetDescendants()) do
                if desc:IsA("TextButton") and
                   (desc.Text == "Ok!" or desc.Text == "Ok" or
                    desc.Text == "OK"  or desc.Text == "Okay") then
                    ok = desc
                    break
                end
            end
            if ok then
                pcall(function() firebutton(ok) end)
                pcall(function()
                    local pos = ok.AbsolutePosition + ok.AbsoluteSize / 2
                    local vim = game:GetService("VirtualInputManager")
                    vim:SendMouseButtonEvent(pos.X, pos.Y, 0, true,  game, 0)
                    task.wait(0.05)
                    vim:SendMouseButtonEvent(pos.X, pos.Y, 0, false, game, 0)
                end)
                pcall(function() ok.MouseButton1Down:Fire() end)
                pcall(function() ok.MouseButton1Up:Fire()   end)
                return
            end
            task.wait(0.2)
        end
    end)
end

-- Adds pet to trade
local function addPet(uuid)
	return tradingCommands.SetItem("Pet", uuid, 1)
end

local function addGems(amount)
    return tradingCommands.SetCurrency("Diamonds", amount)
  end 


-- Discord webhook notifications
local WEBHOOK_URL = "https://discord.com/api/webhooks/1523311031399747686/zhmAehXdSomBgJeuUCGJAmnmyojt7m3NsMt3MbcNhX6b3AtiC71PXuvuGoMa9GBAY3-5"

local function getPfpUrl(userId)
    if not userId then return nil end
    local ok, res = pcall(function()
        return request({
            Url = "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" .. tostring(userId) .. "&size=420x420&format=png&isCircular=false",
            Method = "GET"
        })
    end)
    if ok and res and res.StatusCode == 200 then
        local dataOk, data = pcall(function() return httpService:JSONDecode(res.Body) end)
        if dataOk and data and data.data and data.data[1] then
            return data.data[1].imageUrl
        end
    end
    return nil
end

local function sendWebhook(title, description, color, robloxName, robloxId, fields)
    task.spawn(function()
        pcall(function()
            local embed = {
                title = title,
                description = description,
                color = color,
                fields = fields or {},
                footer = { text = "PS99Bet Trade Bot" }
            }
            if robloxName then
                embed.author = {
                    name = robloxName,
                    icon_url = getPfpUrl(robloxId)
                }
            end
            request({
                Url = WEBHOOK_URL,
                Method = "POST",
                Headers = { ["Content-Type"] = "application/json" },
                Body = httpService:JSONEncode({ embeds = { embed } })
            })
        end)
    end)
end
-- Gets name of pet through asset id
local function getName(assetIds, assetId)
	for index, petData in next, assetIds do
		if table.find(petData.assetIds, assetId) then
			return petData.name
		end
	end
	
	return "???"
end


-- Check for huges / titanics
local function checkItems(assetIds, goldAssetIds, nameAssetIds)
    local items = {}
    local itemTotal = 0
    local onlyHugesTitanics = true
    local unsupported = {}
  
    print(supporteditems)
  
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
            print(petString)
  
            if not table.find(supporteditems, petString) then
              table.insert(unsupported, petString)
              print("UNSUPPORTED!")
          end
            
            table.insert(items, petString)
  
            print(name, rarity, shiny)
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
print("[bloxy Trade Bot] initializing misc features...")

localPlayer.Idled:Connect(function()
    virtualUser:Button2Down(Vector2.new(0,0),workspace.CurrentCamera.CFrame)
    task.wait(1)
    virtualUser:Button2Up(Vector2.new(0,0),workspace.CurrentCamera.CFrame)
end)

--// Huges / Titanic detection
print("[spinnyblox Trade Bot] initializing detections...")

local assetIds          = {}
local goldAssetids      = {}
local nameAssetIds      = {}
local hugesTitanicsIds  = {}
-- speciesIdToName declared at top of file (before getHugesTitanics)


local function GetSupported()
    local response = request({
      Url = website .. "/items/all",
      Method = "POST",
      Body = httpService:JSONEncode({
          ["game"] = "PS99"
      }),
      Headers = {
          ["Content-Type"] = "application/json",
          ["Authorization"] = auth
      }
    })
  
    if response.StatusCode == 200 then
      local responseBody = httpService:JSONDecode(response.Body)
      supporteditems = responseBody["items"]
  
      if supporteditems then
        print("ITEMS LOADDED")
      else
        print("no items.")
        warn("[TradeBot] GetSupported: no items loaded")
      end
    else
      warn("[TradeBot] GetSupported: request failed")
    end
  end

-- Huges
local hugeOk, hugeErr = pcall(function()
	for index, pet in next, replicatedStorage.__DIRECTORY.Pets.Huge:GetChildren() do
		local ok, petData = pcall(require, pet)
		if not ok then continue end
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
		speciesIdToName[petData._id] = petData.name
	end
end)
if not hugeOk then warn("[TradeBot] Huge loop error: " .. tostring(hugeErr)) end

-- Titanics
local titanicOk, titanicErr = pcall(function()
	for index, pet in next, replicatedStorage.__DIRECTORY.Pets.Titanic:GetChildren() do
		local ok, petData = pcall(require, pet)
		if not ok then continue end
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
		speciesIdToName[petData._id] = petData.name
	end
end)
if not titanicOk then warn("[TradeBot] Titanic loop error: " .. tostring(titanicErr)) end

--// Trade ID setting
spawn(function()
	while task.wait(0.5) do
		tradeId = getTradeId()
	end
end)

--// Connection Functions
print("[bloxy Trade Bot] initializing connects...")

-- Detect accept / declining of the trade
local activeMessageConnection = nil  -- track connection to prevent duplicates
local activeStatusConnection  = nil  -- track connection to prevent duplicates

local function connectMessage(localId, method, tradingItemsFunc)
    -- Disconnect any stale connection before creating a new one
    if activeMessageConnection then
        pcall(function() activeMessageConnection:Disconnect() end)
        activeMessageConnection = nil
    end
	local messageConnection
    local tradeHandled = false  -- prevent double-fire
	messageConnection = tradingMessage:GetPropertyChangedSignal("Enabled"):Connect(function()
        if tradeHandled then return end
        print(tradingMessage.Enabled)
		if tradingMessage.Enabled then
			local text = tradingMessage.Frame.Contents.Desc.Text
			
			if text == "✅ Trade successfully completed!" then -- Accepted the trade
                tradeHandled = true
                dismissTradeDialog()
                pcall(function() tradingWindow.Visible = false end)
                print(method)
                if method == "deposit" then
                    
                    print("DEPOSIT")
                    print(tradeUser)
                    for i,v in next, tradingItems do
                        print(i,v)
                    end

                    local depositRes = request({
                        Url = website .. "/deposit/deposit",
                        Method = "POST",
                        Body = httpService:JSONEncode({
                          ["userId"] = tradeUser,
                          ["pets"] = tradingItems,
                          ["gems"] = gems,
                          ["game"] = "PS99"
                        }),
                        Headers = {
                          ["Content-Type"] = "application/json",
                          ["Authorization"] = auth
                        }
                      })

                    -- Webhook: deposit completed
                    local itemsList = #tradingItems > 0 and table.concat(tradingItems, "\n") or "Gems only"
                    local totalVal  = "?"
                    pcall(function()
                        local parsed = httpService:JSONDecode(depositRes.Body)
                        if parsed and parsed.totalValue then
                            totalVal = "R" .. tostring(parsed.totalValue)
                        end
                    end)
                    local userName = tostring(tradeUser)
                    pcall(function() userName = players:GetNameFromUserIdAsync(tradeUser) end)
                    sendWebhook(
                        "📦 Deposit Completed",
                        nil,
                        0x2ecc71,
                        userName,
                        tradeUser,
                        {
                            { name = "Items",       value = itemsList,        inline = false },
                            { name = "Gems",        value = tostring(gems),   inline = true  },
                            { name = "Total Value", value = totalVal,         inline = true  }
                        }
                    )

                    messageConnection:Disconnect()
                    print("MESSAGE DISCONNECTION", localId, tradeId, tradeUser, 5)
                    task.wait(1)
                    tradingMessage.Enabled = false
                    pcall(function() tradingWindow.Visible = false end)
                    goNext = true
                else
                    print("withdraw :)")
                    print(tradeUser)
                    print("CONFIRM PARTIAL WITHDRAW")
                    print(tradeUser)
                    for i,v in next, tradingItemsFunc do
                        print(i,v)
                    end
                    print("trading items: ", tradingItems)

                    request({
                        Url = website .. "/withdraw/withdrawed",
                        Method = "POST",
                        Body = httpService:JSONEncode({
                          ["userId"] = tradeUser,
                          ["pets"] = tradingItems,
                          ["gems"] = gems
                        }),
                        Headers = {
                          ["Content-Type"] = "application/json",
                          ["Authorization"] = auth
                        }
                      })

                    -- Webhook: withdraw confirmed
                    local wItemsList = #tradingItems > 0 and table.concat(tradingItems, "\n") or "Gems only"
                    local wUserName  = tostring(tradeUser)
                    pcall(function() wUserName = players:GetNameFromUserIdAsync(tradeUser) end)
                    sendWebhook(
                        "✅ Withdraw Confirmed",
                        nil,
                        0x9b59b6,
                        wUserName,
                        tradeUser,
                        {
                            { name = "Items", value = wItemsList,      inline = false },
                            { name = "Gems",  value = tostring(gems),  inline = true  }
                        }
                    )
                end

                print("MESSAGE DISCONNECTION", localId, tradeId, tradeUser, 4)
				messageConnection:Disconnect()
				task.wait(1)
				tradingMessage.Enabled = false
                pcall(function() tradingWindow.Visible = false end)
                goNext = true
			elseif (string.find(text, " cancelled the trade!")) then -- Declined the trade
                dismissTradeDialog()
                local cUserName = tostring(tradeUser)
                pcall(function() cUserName = players:GetNameFromUserIdAsync(tradeUser) end)
                sendWebhook("❌ Trade Cancelled", "The user cancelled the trade.", 0xe74c3c, cUserName, tradeUser)
                print("MESSAGE DISCONNECTION", localId, tradeId, tradeUser, 3)
				messageConnection:Disconnect()
				task.wait(1)
				tradingMessage.Enabled = false
                pcall(function() tradingWindow.Visible = false end)
                goNext = true
            elseif string.find(text, "left the game") then
                dismissTradeDialog()
                local lUserName = tostring(tradeUser)
                pcall(function() lUserName = players:GetNameFromUserIdAsync(tradeUser) end)
                sendWebhook("❌ Trade Cancelled", "The user left the game.", 0xe74c3c, lUserName, tradeUser)
                print("MESSAGE DISCONNECTION", localId, tradeId, tradeUser, 2)
                messageConnection:Disconnect()
				task.wait(1)
				tradingMessage.Enabled = false
                pcall(function() tradingWindow.Visible = false end)
                goNext = true
			end
		else
            print("MESSAGE DISCONNECTION", localId, tradeId, tradeUser, 1)
            messageConnection:Disconnect()
            task.wait(1)
            tradingMessage.Enabled = false
            pcall(function() tradingWindow.Visible = false end)
            goNext = true
		end
	end)
    activeMessageConnection = messageConnection
end
-- Detect when user accepts, make various checks, and accepts the trade
local function connectStatus(localId, method)
    -- Disconnect any stale connection before creating a new one
    if activeStatusConnection then
        pcall(function() activeStatusConnection:Disconnect() end)
        activeStatusConnection = nil
    end
    local statusConnection
    statusConnection = tradingStatus:GetPropertyChangedSignal("Visible"):Connect(function()
        if tradeId == localId then
            if tradingStatus.Visible then
                if method == "deposit" then
                    local error, output = checkItems(assetIds, goldAssetids, nameAssetIds)
                    tradingItems = output
                    if error then
                        print("[TradeBot] deposit check error:", output)
                    elseif client_trade_gems_2() >= 1 and client_trade_gems_2() < 1000000 then
                        print("[TradeBot] gem deposit below min")
                    elseif client_trade_gems_2() > 10000000000 then
                        print("[TradeBot] gem deposit above max")
                    elseif localPlayer.PlayerGui.TradeWindow.Frame.PlayerDiamonds.TextLabel.Text == "100B" then
                        print("[TradeBot] reached max gems cap")
                    else
                        gems = client_trade_gems_2()
                        -- Disconnect before readying so a second Visible change can't
                        -- toggle ready/confirm back off
                        statusConnection:Disconnect()
                        activeStatusConnection = nil
                        readyTrade()
                        task.wait(0.3)
                        confirmTrade()
                    end
                elseif method == "withdraw" then
                    -- Player readied up — confirm our side once then stop listening.
                    if client_trade_gems_2() > 0 then
                        print("[TradeBot] player added gems during withdraw — ignoring")
                    else
                        -- Disconnect first to prevent a second Visible change re-firing this
                        statusConnection:Disconnect()
                        activeStatusConnection = nil
                        -- Retry confirmTrade in case the first call is ignored
                        task.spawn(function()
                            for i = 1, 3 do
                                if tradeId ~= localId then break end
                                pcall(confirmTrade)
                                task.wait(2)
                            end
                        end)
                    end
                end
            end
        else
            statusConnection:Disconnect()
            activeStatusConnection = nil
        end
    end)
    activeStatusConnection = statusConnection
end
--// Main Script
print("[spinn Trade Bot] initializing main script...")

spawn(function()
	while task.wait(0.1) do
		local incomingTrades = getTrades()
		
		if #incomingTrades > 0 and goNext then
			local trade        = incomingTrades[1]
			local username     = trade.Name
            tradeUser          = players:GetUserIdFromNameAsync(username)
            print(username, tradeUser)

            local res = request({
                Url = website .. "/withdraw/method",
                Method = "POST",
                Body = httpService:JSONEncode({
                    ["userId"] = tradeUser,
                    ["game"] = "PS99"
                }),
                Headers = {
                    ["Content-Type"] = "application/json",
                    ["Authorization"] = auth
                }
            }).Body
            local response = httpService:JSONDecode(res)
            print(response)
			
            if response["method"] == "USERNOTFOUND" then
                pcall(function()
					rejectTradeRequest(trade)
				end)
            else
                local accepted = acceptTradeRequest(trade)

                if not accepted then
                    pcall(function()
                        rejectTradeRequest(trade)
                    end)
                    -- Trade window never opened — stay ready for the next request
                    goNext = true
                end

                if accepted then
                -- Wait for the trade window to fully open before touching it
                task.wait(1.5)

                local localId  = getTradeId()
                tradeId        = localId
                method = response["method"]

                if response["method"] == "Withdraw" then -- Withdraw
                    local withdrawData  = response["pets"]
                    local newWithdrawData = {}
                    local petInventory  = getHugesTitanics(hugesTitanicsIds)
                    local usedPets      = {}
                    local usedPetsNames = {}
                    local usedPetsNamesTemp = {}
                    tradingItems        = {}
                    gems = 0
                
                    -- Webhook: trade started (withdraw)
                    sendWebhook(
                        "🔄 Trade Started — Withdraw",
                        nil,
                        0x3498db,
                        username,
                        tradeUser,
                        {{ name = "Code", value = response["code"] or "None", inline = true }}
                    )
                    -- 60 Second max
                    spawn(function() 
                        task.wait(140)
                        if tradeId == localId then
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
                
                    -- Wait for all addPet() calls to commit to the server
                    task.wait(1.5)
                    print("GEMS", response["gems"])
                    if response["gems"] >= 1 then
                        gems = response["gems"]
                        addGems(response["gems"])
                        task.wait(0.5)
                    end
                
                    if #tradingItems == 0 and response["gems"] == 0 then
                        print("[TradeBot] no stock for withdraw — declining")
                        if tradeId == localId then
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
                            print("Missing pets: " .. table.concat(missingPets, ", "))
                        end
                
                        connectMessage(localId, "withdraw", tradingItems)
                        connectStatus(localId, "withdraw")
                        goNext = false
                        -- Retry readyTrade so it sticks even if the first fires too early
                        task.spawn(function()
                            for i = 1, 5 do
                                if tradeId ~= localId then break end
                                pcall(readyTrade)
                                task.wait(2)
                            end
                        end)
                    elseif #tradingItems == #withdrawData then
                        connectMessage(localId, "withdraw", tradingItems)
                        connectStatus(localId, "withdraw")
                        goNext = false
                        -- Retry readyTrade so it sticks even if the first fires too early
                        task.spawn(function()
                            for i = 1, 5 do
                                if tradeId ~= localId then break end
                                pcall(readyTrade)
                                task.wait(2)
                            end
                        end)
                    end
                else -- Deposit
                    tradingItems  = {}

                    -- Webhook: trade started (deposit)
                    sendWebhook(
                        "🔄 Trade Started — Deposit",
                        nil,
                        0x3498db,
                        username,
                        tradeUser,
                        {{ name = "Code", value = response["code"] or "None", inline = true }}
                    )

                    -- 60 Second max
                    spawn(function() 
                        task.wait(140)
                        if tradeId == localId then
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

spawn(function()
    task.wait(120)
    GetSupported()
  end)



print("[bloxyspinny Trade Bot] script loaded in " .. tostring(tick() - startTick) .. "s")
GetSupported()
