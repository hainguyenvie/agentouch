import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import agentsRouter from "./agents.js";
import tasksRouter from "./tasks.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentsRouter);
router.use(tasksRouter);

export default router;
