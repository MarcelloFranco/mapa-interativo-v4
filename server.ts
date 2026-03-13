import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploads directory
  app.use('/uploads', express.static(uploadsDir));

  // Multer config for image uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      console.log('Multer: saving to', uploadsDir);
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const type = req.body.type || 'image';
      const ext = path.extname(file.originalname);
      const filename = `${type}-${Date.now()}${ext}`;
      console.log('Multer: generating filename', filename);
      cb(null, filename);
    }
  });

  const upload = multer({ 
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // Increased to 20MB limit
  });

  // API Routes
  app.post('/api/upload-background', (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('Multer error (background):', err);
        return res.status(500).json({ error: `Erro no upload: ${err.message}` });
      }
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      
      const imageUrl = `/uploads/${req.file.filename}`;
      console.log('Background upload success:', imageUrl);
      res.json({ backgroundImage: imageUrl, version: Date.now() });
    });
  });

  app.post('/api/upload-logo', (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('Multer error (logo):', err);
        return res.status(500).json({ error: `Erro no upload: ${err.message}` });
      }
      if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      
      const imageUrl = `/uploads/${req.file.filename}`;
      console.log('Logo upload success:', imageUrl);
      res.json({ logo: imageUrl, version: Date.now() });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
