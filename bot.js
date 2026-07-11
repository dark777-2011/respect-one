const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const Database = require("better-sqlite3");

const db = new Database("applications.db");

require("dotenv").config();




// ======================
// إعداد البوت
// ======================

const client = new Client({

    intents:[

        GatewayIntentBits.Guilds,

        GatewayIntentBits.GuildMembers,

        GatewayIntentBits.DirectMessages

    ],

    partials:[

        Partials.Channel

    ]

});



// ======================
// الإعدادات
// ======================

const APPLY_CHANNEL =
"1525254452058128405";


const VERIFY_ROLE =
"1525458216086143007";



// تخزين الطلبات مؤقتاً
// لاحقاً نربطها بقاعدة بيانات

const applications = new Map();



// ======================
// تشغيل البوت
// ======================

client.once("ready",()=>{


    console.log(
        `🤖 Bot Online: ${client.user.tag}`
    );


});



// ======================
// استقبال طلب من الموقع
// ======================

async function sendApplication(application){


    const channel =
    client.channels.cache.get(
        APPLY_CHANNEL
    );


    if(!channel){

        console.log(
            "❌ روم التفعيل غير موجود"
        );

        return;

    }



    const embed = new EmbedBuilder()

    .setTitle(
        "🛡️ طلب تفعيل جديد | Respect One"
    )

    .setDescription(
        "تم استلام طلب تفعيل جديد\nيرجى مراجعة البيانات."
    )

    .setColor(
        0x8b5cf6
    )


    .addFields(

        {
            name:"👤 الاسم والعمر الحقيقي",
            value:
            `${application.realName || "غير موجود"}\nالعمر: ${application.realAge || "غير موجود"}`,
            inline:false
        },


        {
            name:"🎭 معلومات الشخصية",
            value:
            application.characterInfo || "لم يتم الإدخال",
            inline:false
        },


        {
            name:"📖 قصة الشخصية",
            value:
            application.characterStory || "لم يتم الإدخال",
            inline:false
        },


        {
            name:"⚖️ إيجابيات وسلبيات الشخصية",
            value:
            application.advantages || "لم يتم الإدخال",
            inline:false
        },


        {
            name:"🏙️ سبب دخول المدينة",
            value:
            application.reason || "لم يتم الإدخال",
            inline:false
        }

    )


    .setFooter({

        text:
        "Respect One Activation System"

    })


    .setTimestamp();



    const buttons = new ActionRowBuilder()

    .addComponents(


        new ButtonBuilder()

        .setCustomId(
            `accept_${application.discordID}`
        )

        .setLabel(
            "قبول"
        )

        .setStyle(
            ButtonStyle.Success
        ),


        new ButtonBuilder()

        .setCustomId(
            `reject_${application.discordID}`
        )

        .setLabel(
            "رفض"
        )

        .setStyle(
            ButtonStyle.Danger
        )

    );



    const msg = await channel.send({

        embeds:[
            embed
        ],

        components:[
            buttons
        ]

    });



    applications.set(

        application.discordID,

        {

            messageID:msg.id,

            data:application

        }

    );


}



module.exports = {
    client,
    sendApplication,
    VERIFY_ROLE,
    applications
};


// ======================
// أزرار القبول والرفض
// ======================

client.on("interactionCreate", async (interaction) => {


    if(!interaction.isButton()) return;


    await interaction.deferUpdate();



    const [action, userId] =
    interaction.customId.split("_");



    const member =
    await interaction.guild.members.fetch(
        userId
    ).catch(()=>null);



    if(!member){

        return interaction.reply({

            content:"❌ لم يتم العثور على العضو",

            ephemeral:true

        });

    }



    // ======================
    // قبول
    // ======================

    if(action === "accept"){


        const role =
        interaction.guild.roles.cache.get(
            VERIFY_ROLE
        );



        if(role){

            await member.roles.add(role);

        }



        try{

            await member.send({

                embeds:[{

                    title:"🎉 تم قبول طلب التفعيل",

                    description:
                    "مبروك! تم قبول طلب تفعيلك في **Respect One** ✅",

                    color:0x57F287,

                    timestamp:new Date()

                }]

            });


        }catch(error){

            console.log(
                "DM مغلق"
            );

        }

db.prepare(`
UPDATE applications
SET status = ?
WHERE discord_id = ?
`).run(
    "accepted",
    member.id
);

        await interaction.message.edit({

    content:
    `✅ تم قبول الطلب بواسطة ${interaction.user}`,

    components:[]

});


    }



    // ======================
    // رفض
    // ======================

    if(action === "reject"){


        try{

            await member.send({

                embeds:[{

                    title:"❌ تم رفض طلب التفعيل",

                    description:
                    "نعتذر، تم رفض طلب تفعيلك في **Respect One**.",

                    color:0xED4245,

                    timestamp:new Date()

                }]

            });


        }catch(error){

            console.log(
                "DM مغلق"
            );

        }

db.prepare(`
UPDATE applications
SET status = ?
WHERE discord_id = ?
`).run(
    "rejected",
    member.id
);

        await interaction.message.edit({

    content:
    `❌ تم رفض الطلب بواسطة ${interaction.user}`,

    components:[]

});


    }


});
// ======================
// تسجيل دخول البوت
// ======================

client.login(
    process.env.BOT_TOKEN
);