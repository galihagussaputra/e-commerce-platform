const cartService = require('../services/cart.service');
const { success } = require('../utils/apiResponse');

const get = async (req, res) => success(res, await cartService.getCart(req.user._id));
const add = async (req, res) => success(res, await cartService.addItem(req.user._id, req.params.productId, req.body.quantity));
const update = async (req, res) => success(res, await cartService.updateItem(req.user._id, req.params.productId, req.body.quantity));
const remove = async (req, res) => success(res, await cartService.removeItem(req.user._id, req.params.productId));
const clear = async (req, res) => success(res, await cartService.clearCart(req.user._id));
const sync = async (req, res) => success(res, await cartService.syncCart(req.user._id, req.body.items));

module.exports = { get, add, update, remove, clear, sync };
