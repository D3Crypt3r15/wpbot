const qrcode = require("qrcode-terminal");
const amqp = require("amqplib");
const {Client, LocalAuth, MessageMedia} = require("whatsapp-web.js");
const {MongoClient} = require("mongodb");
require('dotenv').config();

const mongodb_client = new MongoClient(process.env.MONGODB_URI);
const USERS_COLLECTION = mongodb_client.db().collection('users');
const FILES_COLLECTION = mongodb_client.db().collection('files');

function getSay(){
    var today = new Date()
    var curHr = today.getHours()

    if (curHr < 12) {
        return 'Buen dia';
    } else if (curHr < 18) {
        return 'Buenas tardes';
    } else {
        return 'Buenas noches';
    }
}
const wp_client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	}
});
wp_client.on("qr", qr =>{
    qrcode.generate(qr, {small: true});
});

// NOTIFIER
wp_client.on("ready", async()=>{
    console.log("WhtatsApp Activo!");

    // GET NEW MESSAGES FROM QUEUE
    const conn = await amqp.connect({
        protocol: process.env.QUEUE_PROTOCOL ,
        hostname: process.env.QUEUE_HOST,
        port: process.env.QUEUE_PORT,
        username: process.env.QUEUE_USERNAME,
        password: process.env.QUEUE_PASSWORD,
        vhost: process.env.QUEUE_VHOST
    });
    const channelMsgs = await conn.createChannel();
    await channelMsgs.assertQueue(process.env.QUEUE_NAME);

    channelMsgs.consume(process.env.QUEUE_NAME, async (msg) => {
        if (msg !== null) {
            const MSG_BODY = msg.content.toString().split("<SEP>");

            const numberDetails = await wp_client.getNumberId(MSG_BODY[0]); 
            if (numberDetails) {
                await wp_client.sendMessage(numberDetails._serialized, MSG_BODY[1]);
                
                if (MSG_BODY[2]){
                    const FILE_PATHS = MSG_BODY[2].split(",");
                    for (let PATH of FILE_PATHS){
                        let media = MessageMedia.fromFilePath(PATH);
                        await wp_client.sendMessage(numberDetails._serialized, media);
                        console.log("[~] Archivo "+PATH+" enviado.")
                    }
                } 
                console.log("[!] Mensaje enviado a "+MSG_BODY[0]);
            } else {
                console.log(MSG_BODY[0], "Numero no registrado.");
            }
            channelMsgs.ack(msg);
        } else {
          console.log('Consumer cancelled by server');
        }
    });
});

// CHATBOT
wp_client.on("message", async (message)=>{
    const contact = await message.getContact();

    if (!message.isStatus){
        const phoneNumber = contact.number;

        const user= await USERS_COLLECTION.findOne({phoneNumber: phoneNumber});
        const chat = await message.getChat();
        if (!user){
            const msg = "Usted no está suscrito(a) a nuestro servicio.";
            await chat.sendMessage(msg);
            return
        }
        const content = message.body.toLowerCase();
        //
        console.log(content);
        const TEMPLATE = `Hola👋, *${user.username}*! ${getSay()}🤗. ¿En qué puedo ayudarte?`;
        await chat.sendMessage(TEMPLATE);
    }
});
wp_client.on("disconnected", async ()=>{
    await mongodb_client.close();
});

wp_client.initialize();