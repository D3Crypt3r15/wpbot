module.exports = {
    create: async (req, reply) => {
        try{    
            //CREATE USER
            const user = req.body;
            const newUser = await req.app.mongoose.User.create(user);

            // CHANNEL
            const channel = req.app.amqp.channel;
            
            const MSG=`Estimado(a)👋Sr(a).${newUser.username}. Le saluda su Asistente Virtual ${process.env.CHATBOT_NAME}, un gusto 🤗! Usted ha sido suscrito(a) a nuestro servicio de mensajería Instantánea por la empresa V&G Data Consulting S.A.C.\nA través de este chat, usted recibirá alertas por parte de la entidad ${newUser.bussinessName}.\nPuede realizar sus consultas a través de esta plataforma, estaremos disponible para usted 24/7.\nSin más que decir, me despido cordialmente 👍\nQue tenga un excelente Día! 😌NOTA: puede iniciar la interacción utilizando la Palabra "Hola"`;
            const TEMPLATE_MSG = newUser.phoneNumber + "<SEP>" + MSG;

            channel.assertQueue(process.env.QUEUE_NAME);
            channel.sendToQueue(process.env.QUEUE_NAME, Buffer.from(TEMPLATE_MSG));

            //RESPONSE
            reply.code(201).send(newUser);
        }catch(e){
            reply.code(500).send(e);
        }
    },
    fetch: async (req, reply) => {
        try{
            const users = await req.app.mongoose.User.find();
            reply.code(200).send(users);
        }catch(e){
            reply.code(500).send(e);
        }
    },
    get: async (req, reply) => {
        try{
            const phoneNumber = req.params.phonenumber;
            const user = await req.app.mongoose.User.findOne({phoneNumber: phoneNumber});
            reply.code(200).send(user);
        }catch(e){
            reply.code(500).send(e);
        }
    },
    update: async (req, reply) => {
        try{
            const updates = req.body;
            const phoneNumber = req.params.phonenumber;
            const user = await req.app.mongoose.User.findOne({phoneNumber: phoneNumber});
            if (!user){
                return reply.code(404).send("Usuario no existe.");
            }
         
            // CHANNEL
            const channel = req.app.amqp.channel;
            const MSG=`Sus datos han sido actualizados. Para mas información, por favor consultar a *${user.bussinessName}*.`;
            const TEMPLATE_MSG = user.phoneNumber + "<SEP>" + MSG;

            channel.assertQueue(process.env.QUEUE_NAME);
            channel.sendToQueue(process.env.QUEUE_NAME, Buffer.from(TEMPLATE_MSG));

            await req.app.mongoose.User.findOneAndUpdate({phoneNumber: phoneNumber}, updates);
            reply.code(202).send("Usuario Actualizado.");
        }catch(e){
            reply.code(500).send(e);
        }
    },
    delete: async (req, reply) => {
        try{
            const phoneNumber = req.params.phonenumber;
            const user = await req.app.mongoose.User.findOne({phoneNumber: phoneNumber});
            if (!user){
                return reply.code(404).send("Usuario no existe.");
            }

            // CHANNEL
            const channel = req.app.amqp.channel;
            const MSG=`Usted a sido dado de baja de nuestros servicios. Para mas información, por favor consultar a *${user.bussinessName}*.`;
            const TEMPLATE_MSG = user.phoneNumber + "<SEP>" + MSG;

            channel.assertQueue(process.env.QUEUE_NAME);
            channel.sendToQueue(process.env.QUEUE_NAME, Buffer.from(TEMPLATE_MSG));

            await req.app.mongoose.User.findOneAndDelete({phoneNumber: phoneNumber});
            reply.code(202).send("Usuario Eliminado.");
        }catch(e){
            reply.code(500).send(e);
        }
    }
}