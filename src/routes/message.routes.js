const MessageController = require("../controllers/message.controller");

module.exports = async (app) =>{
    app.get("/api/v1/messages", MessageController.fetch);
    app.get("/api/v1/messages/:_id", MessageController.get);
    app.post("/api/v1/messages", MessageController.create);
    app.put("/api/v1/messages/:_id", MessageController.update);
    app.delete("/api/v1/messages/:_id", MessageController.delete);
}