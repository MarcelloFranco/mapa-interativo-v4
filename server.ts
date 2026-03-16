import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

async function startServer() {
 const app = express();
 const PORT = Number(process.env.PORT) || 3000;
 const isProd = process.env.NODE_ENV === "production";

 app.use(express.json({ limit: "50mb" }));
 app.use(express.urlencoded({ limit: "50mb", extended: true }));

 // Ensure uploads directory exists
 const uploadsDir = path.join(process.cwd(), "uploads");
 if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

 // Serve uploads directory
 app.use("/uploads", express.static(uploadsDir));

 // Multer config for image uploads
 const storage = multer.diskStorage({
 destination: (_req, _file, cb) => cb(null, uploadsDir),
 filename: (req, file, cb) => {
 const type = (req.body?.type as string) || "image";
 const ext = path.extname(file.originalname);
 cb(null, `${type}-${Date.now()}${ext}`);
 },
 });

 const upload = multer({
 storage,
 limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
 });

 // API Routes
 app.post("/api/upload-background", (req, res) => {
 upload.single("image")(req, res, (err: any) => {
 if (err) return res.status(500).json({ error: `Erro no upload: ${err.message}` });
 if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

 const imageUrl = `/uploads/${req.file.filename}`;
 res.json({ backgroundImage: imageUrl, version: Date.now() });
 });
 });

 app.post("/api/upload-logo", (req, res) => {
 upload.single("image")(req, res, (err: any) => {
 if (err) return res.status(500).json({ error: `Erro no upload: ${err.message}` });
 if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

 const imageUrl = `/uploads/${req.file.filename}`;
 res.json({ logo: imageUrl, version: Date.now() });
 });
 });

 // Frontend (Vite) handling
 if (isProd) {
 app.use(express.static(path.join(process.cwd(), "dist")));
 app.get("*", (_req, res) => res.sendFile(path.join(process.cwd(), "dist", "index.html")));
 } else {
 const vite = await createViteServer({ server: { middlewareMode: true } });
 app.use(vite.middlewares);
 }

 app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

startServer();
