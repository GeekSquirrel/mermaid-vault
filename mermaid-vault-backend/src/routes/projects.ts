import { Router, type Router as RouterType } from "express";
import { ProjectController } from "../controllers/projectController.js";

export const projectRouter: RouterType = Router();


projectRouter.get("/", ProjectController.listProjects);
projectRouter.get("/:id", ProjectController.getProject);
projectRouter.get("/:id/preview.svg", ProjectController.getProjectPreview);
projectRouter.put("/:id/preview", ProjectController.saveProjectPreview);
projectRouter.post("/", ProjectController.createProject);
projectRouter.put("/:id", ProjectController.updateProject);
projectRouter.delete("/:id", ProjectController.deleteProject);


