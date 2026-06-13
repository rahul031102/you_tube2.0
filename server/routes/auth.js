import express from "express";
import { login, updateprofile } from "../controllers/auth.js";
import { requestOtp, verifyOtp } from "../controllers/otp.js";
const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.post("/otp/request", requestOtp);
routes.post("/otp/verify", verifyOtp);
export default routes;
