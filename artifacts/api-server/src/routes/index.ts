import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contractLensRouter from "./contract-lens";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contractLensRouter);

export default router;
