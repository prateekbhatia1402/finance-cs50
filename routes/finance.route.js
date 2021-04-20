const router = require("express").Router();
const fin = require("../middleware/fin");

router.get('/', fin.get_summary);
router.get('/quote', fin.quote);
router.get('/quotes', fin.quotes);
router.get('/transactions', fin.get_data);
router.post('/buy', fin.purchase);
router.post('/sell', fin.sell);

module.exports = router
