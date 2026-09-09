import { Router, type Router as RouterType } from "express";
import { WorkspaceController } from "../controllers/workspaceController.js";

export const workspaceRouter: RouterType = Router();

workspaceRouter.get("/", WorkspaceController.listWorkspaces);
workspaceRouter.get("/:id", WorkspaceController.getWorkspace);
workspaceRouter.post("/", WorkspaceController.createWorkspace);
workspaceRouter.put("/order", WorkspaceController.updateWorkspaceOrder);
workspaceRouter.put("/:id", WorkspaceController.updateWorkspace);
workspaceRouter.delete("/:id", WorkspaceController.deleteWorkspace);
