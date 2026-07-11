const express = require("express");
const session = require("express-session");
const cors = require("cors");
const axios = require("axios");
const {
    sendApplication
} = require("./bot");
require("dotenv").config();

const app = express();

const Database = require("better-sqlite3");


const db = new Database("applications.db");


db.prepare(`
CREATE TABLE IF NOT EXISTS applications (
    discord_id TEXT PRIMARY KEY,
    status TEXT
)
`).run();


// CORS
app.use(cors({

    origin: [
        "https://respect-one.onrender.com"
    ],

    credentials:true

}));


// JSON
app.use(express.json());


// Session
app.use(session({
    secret: "respect-one-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));


// ملفات الموقع
app.use(express.static("./"));


// =====================
// فحص تسجيل الدخول
// =====================

app.get("/user", (req, res) => {

    if(req.session.user){

        res.json({
            loggedIn: true,
            user: req.session.user
        });

    }else{

        res.json({
            loggedIn:false
        });

    }

});



// =====================
// تسجيل دخول Discord
// =====================

app.get("/auth/discord", (req,res)=>{


    const discordURL =
    `https://discord.com/oauth2/authorize`+
    `?client_id=${process.env.CLIENT_ID}`+
    `&response_type=code`+
    `&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}`+
    `&scope=identify`;


    res.redirect(discordURL);


});




// =====================
// Discord Callback
// =====================

app.get("/auth/callback", async(req,res)=>{


    const code = req.query.code;


    if(!code){

        return res.send("No Discord Code");

    }



    try{


        // طلب التوكن

        const tokenResponse = await axios.post(

            "https://discord.com/api/oauth2/token",

            new URLSearchParams({

                client_id: process.env.CLIENT_ID,

                client_secret: process.env.CLIENT_SECRET,

                grant_type:"authorization_code",

                code:code,

                redirect_uri:process.env.REDIRECT_URI

            }),


            {

                headers:{
                    "Content-Type":"application/x-www-form-urlencoded"
                }

            }

        );




        // معلومات المستخدم

        const userResponse = await axios.get(

            "https://discord.com/api/users/@me",

            {

                headers:{

                    Authorization:
                    `Bearer ${tokenResponse.data.access_token}`

                }

            }

        );



        req.session.user = userResponse.data;



        console.log("Logged in:",
        userResponse.data.username);



        // رجوع للموقع

        res.redirect("/");



    }catch(error){


        console.log(
            error.response?.data || error
        );


        res.send("Discord Login Failed");


    }



});





// تسجيل خروج

app.get("/logout",(req,res)=>{

    req.session.destroy();

    res.redirect("/");

});




// تشغيل السيرفر

app.post("/submit-application", async (req,res)=>{

    console.log("📩 وصل طلب تقديم");

    if(!req.session.user){

        console.log("❌ المستخدم غير مسجل دخول");

        return res.status(401).json({
            success:false,
            error:"not_logged"
        });

    }


    console.log("✅ المستخدم:", req.session.user.username);


    const data = req.body;

    console.log("📋 البيانات:", data);



    const discordID = req.session.user.id;

    const discordName = req.session.user.username;



    try {


    console.log("🚀 إرسال للبوت...");


    await sendApplication({

        discordID,
        discordName,

        realName: data.realName,

        realAge: data.realAge,

        characterInfo: data.characterInfo,

        characterStory: data.characterStory,

        advantages: data.advantages,

        reason: data.reason

    });



        console.log("✅ البوت استلم التقديم");


        const oldApplication = db.prepare(
            "SELECT * FROM applications WHERE discord_id = ?"
        ).get(discordID);



        if(oldApplication){

            return res.json({

                success:false,

                error:"already_applied",

                status:oldApplication.status

            });

        }



        db.prepare(`
            INSERT INTO applications
            (discord_id,status)
            VALUES (?,?)
        `).run(
            discordID,
            "pending"
        );


        console.log("✅ تم حفظه بالداتا");


        res.json({

            success:true

        });


    }catch(error){


        console.log("❌ الخطأ الحقيقي:");

        console.log(error);


        res.status(500).json({

            success:false,

            error:error.message

        });


    }


});// إغلاق app.post



app.listen(3000, ()=>{

    console.log(
        "Server running on http://localhost:3000"
    );

});
