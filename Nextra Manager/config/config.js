export const config = {
    bot: {
        name: "Nextra Manager",
        prefix: "nf",
        website: "https://www.nextraforge.xyz",
        supportServer: "https://discord.gg/kn5tX5TcKN",
        serverName: "Nextra Forge",

        ownerIds: ["1027145130634924032"], // Add your Discord ID here
        mainGuildId: process.env.GUILD_ID
    },

    tickets: {
        categoryId: "1449424282328240320"
    },

    colors: {
        primary: "#5865F2",
        success: "#57F287",
        danger: "#ED4245",
        warning: "#FEE75C",
        info: "#3498DB"
    },
    emojis: {
        ticket: "🎫",
        check: "<:tick:1464613363274481822>",
        cross: "<:Cross:1464614400051904646>",
        lock: "🔒",
        unlock: "🔓",
        trash: "🗑️",
        logs: "📜",
        dashboard: "📊",
        add: "➕",
        remove: "➖",
        loading: "<a:loading:1464614841338564638>",
        dot: "<a:dot:1464616099671970026>"
    }
};


