const router = require('express').Router();
const controller = require('../controllers/productController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth, roleCheck('owner', 'staff'));
router.get('/', controller.getAll);
router.post('/', roleCheck('owner'), controller.create);
router.put('/:id', roleCheck('owner'), controller.update);
router.delete('/:id', roleCheck('owner'), controller.delete);

module.exports = router;
