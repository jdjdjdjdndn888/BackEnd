// made cus i did not wanna write this in every export

const axios = require("axios");
const users = require("../../modules/users.js");
const history = require("../../modules/history.js");
const coinflips = require("../../modules/coinflips.js");
const Jackpot = require("../../modules/jackpots.js");
const inventorys = require("../../modules/inventorys.js");
const items = require("../../modules/items.js");
const userSockets = require("../../socket/usersockets.js"); 
const moment = require("moment")
const { xp } = require("../../config.js")


exports.addHistory = async function (userid, type, amount) {

    try {
        const user = await users.findOne({ userid });
        if (!user) return { success: false, message: "User not found" };

        const newHistory = new history({
            userid: user.userid,
            type: type || "???",
            amount: `${amount || 0}`,
            date: new Date()
        });

        await newHistory.save();
        return { success: true, message: "OK" };
    } catch (error) {
        console.log(`[LIBARY - ADDHISTORY : ${error}]`);
        return { success: false, message: "something went wrong" };
    }
};

// Standard embed colors so every game log reads at a glance:
// green = win, red = loss, blue = created/pending, gold = jackpot.
exports.WEBHOOK_COLORS = {
    WIN: 0x2ecc71,
    LOSS: 0xe74c3c,
    CREATE: 0x3498db,
    JACKPOT: 0xf1c40f,
    NEUTRAL: 0x2061822 & 0xffffff,
};

exports.sendwebhook = async function (webhook, title, description, fields, thumbnail, banner, color) {
    if (!webhook) return { success: false, message: "No webhook URL" };

    const embed = {};
    if (title) embed.title = title;
    if (description) embed.description = description;
    if (thumbnail) embed.thumbnail = { url: thumbnail };
    if (banner) embed.image = { url: banner };
    if (fields && Array.isArray(fields) && fields.length > 0) {
        embed.fields = fields.map(field => {
            if (field.value.length > 1024) {
                return { ...field, value: field.value.slice(0, 1000) + "...\n**and some more**..." };
            }
            return field;
        });
    }
    embed.footer = { text: "gemtide.win" };
    embed.color = typeof color === "number" ? color : 2061822;
    embed.timestamp = new Date().toISOString();

    const MAX_RETRIES = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await axios.post(webhook, { embeds: [embed] });
            return { success: true, message: "OK" };
        } catch (error) {
            const status = error?.response?.status;

            if (status === 429) {
                const retryAfterMs = ((error?.response?.data?.retry_after) || 30) * 1000;
                const waitMs = Math.max(retryAfterMs, delay);
                console.warn(`[SENDWEBHOOK] Rate limited (attempt ${attempt}/${MAX_RETRIES}), retrying in ${waitMs}ms...`);
                await new Promise(r => setTimeout(r, waitMs));
                delay *= 2;
                continue;
            }

            const body = JSON.stringify(error?.response?.data);
            console.error(`[SENDWEBHOOK] FAILED — status=${status} body=${body} url=${webhook?.slice(0, 60)}...`);
            return { success: false, message: "Something went wrong" };
        }
    }

    console.error(`[SENDWEBHOOK] Gave up after ${MAX_RETRIES} retries — url=${webhook?.slice(0, 60)}...`);
    return { success: false, message: "Rate limited, gave up" };
};

exports.sendnoneembed = async function (webhook, message) {
    /*
    TITLE: FUNCTION TO SEND A DISCORD WEBHOOK MESSAGE WITHOUT EMBED

    USAGE: REQUIREDMODULE.sendnoneembed(webhook, message)

    EXTRA: ONLY THE WEBHOOK AND MESSAGE ARE REQUIRED!

    RETURNS: { success: BOOLEAN, message: STRING }
    */

    if (!webhook) return { success: false, message: "No webhook URL" };

    try {
        await axios.post(webhook, { content: message });
        return { success: true, message: "OK" };
    } catch (error) {
        console.log(`[LIBRARY - SENDNONEEMBED : ${error}]`);
        return { success: false, message: "Something went wrong" };
    }
};
exports.updateuser = async function (userid, io) {
    if (!userid) return { success: false, message: "no user" };

    try {
        const [user, inventory, userhistory] = await Promise.all([
            users.findOne({ userid: userid }).lean(),    
            inventorys.find({ owner: userid }).lean(),
            history.find({ userid: userid }).lean(),
        ]);

        if (!user) {
            return { success: false, message: "user not found!" };
        }

        const itemIds = inventory.map((item) => item.itemid);

        const itemsDetails = await items.find({ itemid: { $in: itemIds } }).lean();

        const inventoryValue = inventory.reduce((total, invItem) => {
            const itemDetail = itemsDetails.find((item) => item.itemid === invItem.itemid);
            return total + (itemDetail?.itemvalue || 0) * (invItem.quantity || 1);
        }, 0);

        const data = {
            userid: user.userid,
            username: user.username,
            thumbnail: user.thumbnail,
            displayname: user.displayname,
            rank: user.rank,
            wager: user.wager,
            won: user.won,
            lost: user.lost,
            value: inventoryValue.toFixed(2),
            balance: user.balance,
            level: user.level,
            history: userhistory,
            discordid: user.discordid,
            discordusername: user.discordusername,
        };

        const userSocketIds = userSockets.get(user.userid);

        if (userSocketIds.length === 0) {
            return { success: false, message: "No active sockets found for user" };
        }

        userSocketIds.forEach(socketId => {
            const socketInstance = io.sockets.sockets.get(socketId);
            if (socketInstance) {
                socketInstance.emit("UPDATE_ME", data);
            }
        });
        
        return { success: true, message: "OK" };
    } catch (error) {
        console.log(error);
        return { success: false, message: "Something went wrong" };
    }
};

exports.emituser = async function(event, value, userid, io){
    const userSocketIds = userSockets.get(userid);

    userSocketIds.forEach(socketId => {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) {
            socketInstance.emit(event, value);
        }
    });
    
    return { success: true, message: "OK" };
}

exports.updatestats = async function (io) {
    try {
        const flips = await coinflips.find({
            $or: [
                { active: true },
                { active: false, end: { $gte: moment().subtract(1, 'minutes').toDate() } }
            ]
        });

        const coinflipsvalues = flips.reduce((sum, flip) => sum + (flip.requirements?.static || 0), 0);

        const activeJackpot = await Jackpot.findOne({ state: { $ne: "Ended" } }).exec();

        io.emit("UPDATE_STATS", {
            coinflip: coinflipsvalues,
            jackpot: activeJackpot ? activeJackpot.value : 0,
            giveaway: 0,
            BALANCE_RAIN: "???"
        });

        return { success: true, message: "OK" };
    } catch (error) {
        console.error("Error in updatestats:", error);
        return { success: false, message: "Something went wrong" };
    }
};

exports.level = async function (userid, bet) {
    try {
        const user = await users.findOne({ userid });

        if (!user) return { success: false, message: "User not found" };

        const newLevel = Math.floor(xp * Math.sqrt((user.wager || 0) + (bet || 0)));

        if (user.level >= 99 || newLevel > 99) {
            return { success: true, message: "Success - not updated" };
        }

        user.level = newLevel;
        await user.save();

        return { success: true, message: "Success" };
    } catch (error) {
        console.error(`[LIBRARY - LEVEL ERROR]: ${error.message}`);
        return { success: false, message: "Something went wrong" };
    }
};

