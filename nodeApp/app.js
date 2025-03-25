const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');

const app = express();
const port = process.env.PORT || 3000;

// Configure Multer to use memory storage (to get file data as Buffer)
const upload = multer({ storage: multer.memoryStorage() });

// MySQL connection configuration – update with your own credentials
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // change to your MySQL username
    password: 'Hello124$',  // change to your MySQL password
    database: 'photo_gallery_db'      // ensure this matches your created database
});

// Create the photos table if it doesn't exist (this is optional if you've already created it manually)
connection.query(`
CREATE TABLE IF NOT EXISTS photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image LONGBLOB NOT NULL
)
`, (err) => {
    if (err) {
        console.error('Error creating photos table:', err);
    } else {
        console.log('Photos table is ready.');
    }
});

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static('public'));

// Route: Upload a photo
// Use the "photo" field in your form/data for the file upload
app.post('/upload', upload.single('photo'), (req, res) => {
    const { name } = req.body;
    if (!name || !req.file) {
        return res.status(400).json({ error: 'Name and photo file are required.' });
    }

    const imageData = req.file.buffer;
    connection.query('INSERT INTO photos (name, image) VALUES (?, ?)', [name, imageData], (err, results) => {
        if (err) {
            console.error('Error inserting photo:', err);
            return res.status(500).json({ error: 'Failed to upload photo.' });
        }
        res.status(200).json({ message: 'Photo uploaded successfully.', id: results.insertId });
    });
});

// Route: Get a list of all photos (metadata only)
app.get('/photos', (req, res) => {
    connection.query('SELECT id, name FROM photos', (err, results) => {
        if (err) {
            console.error('Error fetching photos:', err);
            return res.status(500).json({ error: 'Failed to fetch photos.' });
        }
        res.status(200).json(results);
    });
});

// Route: Search for photos by name (using a query parameter)
app.get('/search', (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: 'Search term is required.' });
    }
    connection.query('SELECT id, name FROM photos WHERE name LIKE ?', [`%${name}%`], (err, results) => {
        if (err) {
            console.error('Search error:', err);
            return res.status(500).json({ error: 'Search failed.' });
        }
        res.status(200).json(results);
    });
});

// Route: Get a single photo by ID (returns the binary image data)
// This endpoint can be used to display the image in an <img> tag
app.get('/photo/:id', (req, res) => {
    const { id } = req.params;
    connection.query('SELECT name, image FROM photos WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching photo:', err);
            return res.status(500).json({ error: 'Failed to fetch photo.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Photo not found.' });
        }
        const photo = results[0];
        // Set appropriate content type – adjust if you're handling different image formats
        res.set('Content-Type', 'image/jpeg');
        res.send(photo.image);
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});