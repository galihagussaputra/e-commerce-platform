const productService = require('../services/product.service');
const { success } = require('../utils/apiResponse');

const list = async (req, res) => {
  const result = await productService.listProducts(req.query);
  success(res, result.items, 200, { total: result.total, page: result.page, limit: result.limit });
};

const detail = async (req, res) => success(res, await productService.getProduct(req.params.id));
const featured = async (req, res) => {
  const result = await productService.listProducts({ featured: true, limit: 8 });
  success(res, result.items);
};
const create = async (req, res) => success(res, await productService.createProduct(req.body), 201);
const update = async (req, res) => success(res, await productService.updateProduct(req.params.id, req.body));
const remove = async (req, res) => success(res, await productService.removeProduct(req.params.id));

const categories = async (req, res) => success(res, await productService.listCategories());
const createCategory = async (req, res) => success(res, await productService.createCategory(req.body), 201);
const updateCategory = async (req, res) => success(res, await productService.updateCategory(req.params.id, req.body));
const removeCategory = async (req, res) => success(res, await productService.removeCategory(req.params.id));

module.exports = {
  list,
  detail,
  featured,
  create,
  update,
  remove,
  categories,
  createCategory,
  updateCategory,
  removeCategory,
};
