import { Router } from "express";
import { getRenderImage, getRenderSvg } from "../controllers/renderController.js";

// Read-only image endpoints consumed directly by the browser (new tab,
// Markdown images). The :state param uses the same serde format as the
// frontend URL hash ("pako:<base64url(deflate(json))>").
export const renderRouter: Router = Router();

renderRouter.get("/svg/:state", getRenderSvg);
renderRouter.get("/img/:state", getRenderImage);
