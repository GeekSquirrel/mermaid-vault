import { Router, type Router as RouterType } from "express";
import { DiagramController } from "../controllers/diagramController.js";

export const diagramRouter: RouterType = Router();


diagramRouter.get("/", DiagramController.listDiagrams);
diagramRouter.get("/:id", DiagramController.getDiagram);
diagramRouter.get("/:id/preview.svg", DiagramController.getDiagramPreview);
diagramRouter.put("/:id/preview", DiagramController.saveDiagramPreview);
diagramRouter.post("/", DiagramController.createDiagram);
diagramRouter.put("/:id", DiagramController.updateDiagram);
diagramRouter.delete("/:id", DiagramController.deleteDiagram);


