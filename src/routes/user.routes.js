const UserController = require("../controllers/user.controller");

module.exports = async (app) =>{
    app.get("/api/v1/users", UserController.fetch);
    app.get("/api/v1/users/:phonenumber", UserController.get);
    app.post("/api/v1/users", UserController.create);
    app.put("/api/v1/users/:phonenumber", UserController.update);
    app.delete("/api/v1/users/:phonenumber", UserController.delete);
}