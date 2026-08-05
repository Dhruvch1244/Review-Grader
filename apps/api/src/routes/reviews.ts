import { Router } from "express";
import { listReviews } from "../queries";

export const reviewsRouter = Router();

reviewsRouter.get("/", (_req, res) => {
  res.json(listReviews());
});
