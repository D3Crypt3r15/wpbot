const fs = require("fs");

module.exports = {
    create: async (req, reply) => {
        try{
            const message = req.body;

            const files = message["files"];
            message["files"]=[];
            var paths = "";
            if (files){
                for (let _file of files){
                    const filename = _file["filename"]; // SANITIZE CONTENT
                    const filepath = "./static/uploads/user_files/"+filename;

                    // CREATE FILE
                    const rawFile={filename: filename, filepath: filepath};
                    const file = new req.app.mongoose.File(rawFile);
                    file.save();
                    message["files"].push(file._id);

                    // SAVE FILE
                    let byteContent = Buffer.from(_file["content"], "base64");
                    fs.writeFileSync(filepath, byteContent);
                    paths+=(filepath+",");
                }
                paths=paths.substring(0, paths.length-1);
            }

            // CREATE MESSAGE
            const newMessage = await req.app.mongoose.Message.create(message);

            // CHANNEL
            const channel = req.app.amqp.channel;
            const TEMPLATE_MSG = message["phoneNumber"]+ "<SEP>" + message["message"]+ "<SEP>" + paths;

            channel.assertQueue(process.env.QUEUE_NAME);
            channel.sendToQueue(process.env.QUEUE_NAME, Buffer.from(TEMPLATE_MSG));

            //RESPONSE
            reply.code(201).send(newMessage);
        }catch(e){
            reply.code(500).send(e);
        }
    },
    fetch: async (req, reply) => {
        try{
            const messages = await req.app.mongoose.Message.find();
            reply.code(200).send(messages);
        }catch(e){
            reply.code(500).send(e);
        }
    },
    get: async (req, reply) => {
        try{
            const _id = req.params._id;
            const message = await req.app.mongoose.Message.findById(_id);
            reply.code(200).send(message);
        }catch(e){
            reply.code(500).send(e);
        }
    },
    update: async (req, reply) => {
        try{
            const updates = req.body;
            const ID = req.params._id;
            const message = await req.app.mongoose.Message.findById(ID);
            if (!message){
                return reply.code(404).send("Mensaje no existe.");
            }
         
            await req.app.mongoose.Message.findOneAndUpdate({_id: ID}, updates);
            reply.code(202).send("Mensaje Actualizado.");
        }catch(e){
            reply.code(500).send(e);
        }
    },
    delete: async (req, reply) => {
        try{
            const ID = req.params._id;
            const message = await req.app.mongoose.Message.findById(ID);
            if (!message){
                return reply.code(404).send("Mensaje no existe.");
            }

            await req.app.mongoose.Message.findOneAndDelete({_id: ID});
            reply.code(202).send("Mensaje Eliminado.");
        }catch(e){
            reply.code(500).send(e);
        }
    }
}