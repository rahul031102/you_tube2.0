import express from "express";
import { getLocation, login, updateprofile } from "../controllers/auth.js";
import { requestOtp, verifyOtp } from "../controllers/otp.js";
import { listUsers, saveNickname } from "../controllers/userController.js";
const routes = express.Router();

routes.get("/location", getLocation);
routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.post("/otp/request", requestOtp);
routes.post("/otp/verify", verifyOtp);
routes.get("/list", listUsers);
routes.post("/nickname", saveNickname);
export default routes;
