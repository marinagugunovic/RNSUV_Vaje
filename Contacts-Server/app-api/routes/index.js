const ctrlLoyalty = require('../controllers/loyalty');

const express = require('express')
const router = express.Router();
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'skrivniKljucZaJWT123';

/* KRMILNIKI */
const ctrlContacts = require('../controllers/contacts');
const ctrlAuth = require('../controllers/authentication');

/* Avtentikacija */
router.post('/signup', ctrlAuth.signUp); // Registracija novega uporabnika
router.post('/login', ctrlAuth.login); // Prijava uporabnika

/* Kontakti */
/*router.get('/contacts', ctrlContacts.getAllContacts); // Pridobi vse kontakte
router.get('/contacts/:id', ctrlContacts.getContactById); // Pridobi posamezen kontakt
router.post('/contacts', ctrlContacts.createContact); // Ustvari nov kontakt
router.put('/contacts/:id', ctrlContacts.updateContact); // Posodobi kontakt
router.delete('/contacts/:id', ctrlContacts.deleteContact); // Izbrisi kontakt*/

/* Kontakti - varovano */
router.get('/contacts', authenticateToken, ctrlContacts.getAllContacts); // Pridobi vse kontakte
router.get('/contacts/:id', authenticateToken, ctrlContacts.getContactById); // Pridobi posamezen kontakt
router.post('/contacts', authenticateToken, ctrlContacts.createContact); // Ustvari nov kontakt
router.put('/contacts/:id', authenticateToken, ctrlContacts.updateContact); // Posodobi kontakt
router.delete('/contacts/:id', authenticateToken, ctrlContacts.deleteContact); // Izbrisi kontakt
/* Loyalty (varovano) */
router.get('/dashboard', authenticateToken, ctrlLoyalty.getDashboard);
router.post('/redeem/:rewardId', authenticateToken, ctrlLoyalty.redeemReward);


/* Middleware za preverjanje JWT */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        console.error('Unauthorized - Token not provided');
        return res.status(401).json({ error: 'Unauthorized - Token not provided' });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.error('Forbidden - Invalid token:', err);
            return res.status(403).json({ error: 'Forbidden - Invalid token' });
        }
        req.user = user;
        next();
    });
}

module.exports = router;