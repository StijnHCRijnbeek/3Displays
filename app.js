require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Voeg je eigen test-key toe in een .env bestand
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. MULTER CONFIGURATIE VOOR 3D BESTANDEN ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Zorg dat deze map bestaat
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Toegestane 3D-bestandstypen
    const allowedExtensions = ['.obj', '.fbx', '.3mf', '.stl'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Ongeldig bestandstype. Alleen .obj, .fbx, .stl en .3mf zijn toegestaan.'));
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// --- 2. ROUTE: 3D MODEL UPLOADEN ---
app.post('/api/upload-model', upload.single('modelFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Geen bestand geüpload.' });
        }
        
        // Hier zou je normaal gesproken de bestandsinfo in een database (bijv. MongoDB/PostgreSQL) opslaan
        res.status(200).json({ 
            message: '3D model succesvol geüpload!',
            fileUrl: `/uploads/${req.file.filename}` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- 3. ROUTE: AANVRAAG VOOR CUSTOM MODEL ---
app.post('/api/request-custom', (req, res) => {
    const { name, email, description, dimensions } = req.body;

    if (!name || !email || !description) {
        return res.status(400).json({ error: 'Vul alle verplichte velden in.' });
    }

    // Hier sla je de aanvraag op in de database of stuur je een e-mail naar jezelf
    res.status(200).json({ 
        message: 'Aanvraag succesvol ontvangen. We nemen spoedig contact op met een prijsopgave!' 
    });
});

// --- 4. ROUTE: THEORETISCHE BETALING (STRIPE CHECKOUT) ---
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { modelName, price } = req.body; // Prijs wordt in centen doorgegeven (bijv. 2500 voor €25,00)

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'ideal'], // iDEAL is handig in NL
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: modelName || '3D Print Service',
                        },
                        unit_amount: price, 
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: 'http://jouwwebsite.nl/success',
            cancel_url: 'http://jouwwebsite.nl/cancel',
        });

        res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server draait op http://localhost:${PORT}`);
});
