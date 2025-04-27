import "dotenv/config";

import path from "path";

import express from "express";
import cors from "cors";
import fileUpload, { type UploadedFile } from "express-fileupload";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import * as tf from "@tensorflow/tfjs-node";
import * as nsfwjs from "nsfwjs";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const PORT = process.env.PORT || 3000;
const THRESHOLD = Number(process.env.THRESHOLD || 0.5);
const MODEL_PATH = path.join(__dirname, "models", "mobilenet_v2_mid", "model.json");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(
	cors({
		origin: CORS_ORIGIN,
	})
);
app.use(fileUpload());
app.use(helmet());
app.use(morgan("dev"));
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		limit: 100,
	})
);

tf.enableProdMode();

// Load NSFW.JS model
let model: nsfwjs.NSFWJS | undefined = undefined;

async function loadModel() {
	if (!model) {
		console.log("Loading model...");
		model = await nsfwjs.load(`file://${MODEL_PATH}`, { type: "graph" });
	}
	return model;
}

app.get("/", (req, res) => {
	res.json({ message: "trafficlunar's moderation api", url: "https://github.com/trafficlunar/api-moderation" });
});

app.post("/image", async (req, res) => {
	if (!req.files || !req.files.image) {
		res.status(400).json({ success: false, error: "No image was found" });
		return;
	}

	const image = req.files.image as UploadedFile;

	try {
		const decodedImage = tf.node.decodeImage(image.data, 3) as tf.Tensor3D;
		const model = await loadModel();
		const predictions = await model.classify(decodedImage);
		decodedImage.dispose();

		for (const pred of predictions) {
			if (
				(pred.className === "Porn" && pred.probability > THRESHOLD) ||
				(pred.className === "Hentai" && pred.probability > THRESHOLD) ||
				(pred.className === "Sexy" && pred.probability > THRESHOLD)
			) {
				// reject image
				res.status(400).json({ success: false, error: "Image contains inappropriate content" });
				return;
			}
		}
	} catch (error) {
		console.error("Image moderation failed:", error);
		res.status(500).json({ success: false, error: "Failed to moderate image" });
		return;
	}

	res.status(200).json({ success: true });
});

app.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
