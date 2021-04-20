const router = require("express").Router();
const auth = require("../middleware/auth");

router.get('/', auth.logged_in_user);
router.get('/login', (req, res) => {
    res.redirect('http://google.com') // TODO: url of login page would come here
})
router.post('/login', (req, res) => {
    console.log(req.body);
    auth.login(req, res);
});
router.get('/register', (req, res) => {
    res.redirect('http://google.com') // TODO: url of register page would come here
})
router.post('/register', auth.register);

module.exports = router;