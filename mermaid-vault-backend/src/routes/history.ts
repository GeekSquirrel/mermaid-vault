import { Router, type Router as RouterType } from "express";
import { HistoryController } from "../controllers/historyController.js";

export const historyRouter: RouterType = Router();

historyRouter.get("/", HistoryController.listHistory);
historyRouter.get("/:id", HistoryController.getHistory);
historyRouter.get("/:id/preview.svg", HistoryController.getHistoryPreview);
historyRouter.put("/:id/preview", HistoryController.saveHistoryPreview);
historyRouter.post("/", HistoryController.createHistory);
historyRouter.put("/:id", HistoryController.updateHistory);
historyRouter.delete("/:id", HistoryController.deleteHistory);
historyRouter.delete("/", HistoryController.clearHistory);
