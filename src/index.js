const app= require("fastify")({
    logger: true
});

//
const userRoutes = require("./routes/user.routes");
const messageRoutes = require("./routes/message.routes");

userRoutes(app);
messageRoutes(app);

app.decorateRequest('fastify', null)    
app.addHook("onRequest", async (req, reply) => {
    if (req.headers['token'] !== process.env.JWT_SECRET){
        reply.code(403).send("Sin autorizacion para acceder a este recurso.");
    }
    req.app = app;
}); 
//
const initialize = async ()=>{
    app.register(require("@fastify/env"), {
        confKey: 'config',
        dotenv: true,
        data: process.env,

        schema: {
            type: "object",
            required: ["PORT", "MONGODB_URI", "CHATBOT_NAME", "JWT_SECRET", "QUEUE_PROTOCOL", "QUEUE_HOSTNAME", "QUEUE_PORT", "QUEUE_USERNAME", "QUEUE_PASSWORD", "QUEUE_VHOST", "QUEUE_NAME"],
            properties: {
                PORT: {
                    type: 'number'
                },
                MONGODB_URI: {
                    type: 'string'
                },
                CHATBOT_NAME: {
                    type: "string"
                },
                JWT_SECRET: {
                    type: "string"
                },
                QUEUE_PROTOCOL: {
                    type: "string"
                },
                QUEUE_HOSTNAME: {
                    type: "string"
                },
                QUEUE_PORT: {
                    type: "string"
                },
                QUEUE_USERNAME: {
                    type: "string"
                },
                QUEUE_PASSWORD: {
                    type: "string"
                },
                QUEUE_VHOST: {
                    type: "string"
                },
                QUEUE_NAME: {
                    type: "string"
                }
            }
        }
    });
    await app.after(); 

    app.register(require("@fastify/cors"),(instance) => {
        return (req, callback) => {
            const corsOptions = {
                // This is NOT recommended for production as it enables reflection exploits
                origin: true
            };
        
            // do not include CORS headers for requests from localhost
            if (/^localhost$/m.test(req.headers.origin)) {
                corsOptions.origin = false
            }
        
            // callback expects two parameters: error and options
            callback(null, corsOptions)
        }
    });
    app.register(require('fastify-mongoose-driver').plugin, {
        uri: process.env.MONGODB_URI,
        settings: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            config: {
                autoIndex: true
            }
        },
        models: [
            {
                name: "users",
                alias: "User",
                schema: {
                    workerNumber: {
                        type: String,
                        unique: [true, 'Numero de trabajador ya existe.'],
                        required: [true, "Numero de trabajador requerido."]
                    },
                    username: {
                        type: String,
                        unique: [true, 'Nombre de usuario ya existe.'],
                        required: [true, "Nombre de usuario requerido."]
                    },
                    dni: {
                        type: String,
                        unique: [true, 'Numero de DNI ya existe.'],
                        required: [true, "Numero de DNI del usuario requerido."],
                        validate(value){
                            if (!/^[\d]{8}$/.test(value)){
                                throw new Error('DNI invalido.');
                            }
                        }
                    },
                    phoneNumber: {
                        type: String,
                        unique: [true, 'Numero de telefono ya existe.'],
                        required: [true, "Numero de telefono del usuario requerido."],
                        validate(v){
                            if (!/^[\d]{11}$/.test(v)){
                                throw new Error('Numero de telefono invalido.')
                            }
                        }
                    },
                    bussinessName: {
                        type: String,
                        required: [true, "Nombre de la empresa a la cual pertenece el usuario es requerido."]
                    },
                    isActive: {
                        type: Boolean,
                        default: true
                    },
                    createAt: {
                        type: Date,
                        default: Date.now()
                    }                
                },
                virtualize: (schema) => {
                    schema.virtual("files", {
                        ref: "File",
                        localField: "_id",
                        foreignField: "user",
                    });
                }
            },
    
            {
                name: "files",
                alias: "File",
                schema: {
                    filename: {
                        type: String
                    },
                    filepath: {
                        type: String
                    },
                    createAt: {
                        type: Date,
                        default: Date.now
                    }
                }
            }, 
            {
                name: "messages",
                alias: "Message",
                schema: {
                    phoneNumber: {
                        type: String
                    },
                    appName: {
                        type: String
                    },
                    appUrl: {
                        type: String
                    },
                    message: {
                        type: String
                    },
                    files: [{
                        type: "ObjectId",
                        ref: "File",
                        validateExistance: true               
                    }],
                    status: {
                        choice: ["en cola", "leido", "error"],
                        type: String
                    },
                    createAt: {
                        type: Date,
                        default: Date.now
                    }
                }
            }
        ],
        useNameAndAlias: true
        
    }, (err) => {
        if (err) throw err;
    });
    app.register(require("fastify-amqp"), {
        protocol: process.env.QUEUE_PROTOCOL ,
        hostname: process.env.QUEUE_HOSTNAME,
        port: process.env.QUEUE_PORT,
        username: process.env.QUEUE_USERNAME,
        password: process.env.QUEUE_PASSWORD,
        vhost: process.env.QUEUE_VHOST
    });
};
initialize();

(async ()=>{
    try{
        await app.ready();
        app.listen({port: process.env.PORT});
    } catch(error){
        app.log.error(error);
        process.exit(1);
    }
})();
