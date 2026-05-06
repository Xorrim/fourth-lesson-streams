import express from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream';

const PORT = process.env.PORT || 8000;
const app = express();

app.use(express.static('public'));

// ─── 1. Upload ───────────────────────────────────────────────────────────────

app.post('/upload', (req, res) => {
    const uploadsDir = path.join('public', 'uploads');

    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = req.headers['x-file-name'];

    if (!fileName.endsWith('.txt')) {
        return res.status(400).send('Only .txt files are allowed');
    }

    const filePath = path.join(uploadsDir, path.basename(fileName));
    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
        res.redirect('/');
    });

    writeStream.on('error', (err) => {
        console.error('Write error:', err);
        res.status(500).send('Failed to save file');
    });
});

// ─── 2. Download ─────────────────────────────────────────────────────────────

app.get('/download', (req, res) => {
    const fileName = req.query.filename || 'sample-2mb.txt';
    const baseName = path.basename(fileName);

    const candidates = [
        path.join('public', 'uploads', baseName),
        path.join('public', baseName),
    ];

    const filePath = candidates.find(p => fs.existsSync(p));

    if (!filePath) {
        return res.status(404).send(`File "${baseName}" not found`);
    }

    res.download(filePath, baseName);
});

// ─── 3. Download with Gzip Compression ───────────────────────────────────────

app.get('/download-compression', (req, res) => {
    const fileName = req.query.filename || 'sample-2mb.txt';
    const baseName = path.basename(fileName);

    const candidates = [
        path.join('public', baseName),
        path.join('public', 'uploads', baseName),
    ];

    const filePath = candidates.find(p => fs.existsSync(p));

    if (!filePath) {
        return res.status(404).send(`File "${baseName}" not found`);
    }

    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.gz"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    const readStream = fs.createReadStream(filePath);
    const gzip = zlib.createGzip();

    pipeline(readStream, gzip, res, (err) => {
        if (err) {
            console.error('Compression error:', err);
            if (!res.headersSent) {
                res.status(500).send('Failed to compress and send file');
            }
        }
    });
});


app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});