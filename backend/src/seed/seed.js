const { connectDatabase, disconnectDatabase } = require('../config/database');
const config = require('../config');
const Category = require('../models/Category');
const Product = require('../models/Product');
const User = require('../models/User');
const StockMovement = require('../models/StockMovement');

const categories = [
  { name: 'Audio', slug: 'audio', description: 'Headphones, speakers and listening gear' },
  { name: 'Wearables', slug: 'wearables', description: 'Smartwatches and everyday tech' },
  { name: 'Accessories', slug: 'accessories', description: 'Carry, protect and personalize' },
  { name: 'Workspace', slug: 'workspace', description: 'Tools for a better desk' },
];

const products = [
  {
    name: 'Studio Wireless Headphones', slug: 'studio-wireless-headphones', brand: 'Sonora',
    description: 'Over-ear wireless headphones with active noise cancellation and 30-hour battery life.',
    price: 2499000, compareAtPrice: 2999000, category: 'audio', stock: 32, featured: true, lowStockThreshold: 6,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=80'],
    variants: [{ name: 'Color', sku: 'AUD-HP-001', options: ['Black', 'Sand'], priceAdjustment: 0 }],
  },
  {
    name: 'Chrono Smartwatch', slug: 'chrono-smartwatch', brand: 'Vantage',
    description: 'A lightweight smartwatch with fitness tracking, GPS and a 14-day battery.',
    price: 1799000, category: 'wearables', stock: 18, featured: true, lowStockThreshold: 5,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80'],
    variants: [{ name: 'Strap', sku: 'WEA-SW-001', options: ['Graphite', 'Silver'], priceAdjustment: 0 }],
  },
  {
    name: 'Everyday Canvas Sneakers', slug: 'everyday-canvas-sneakers', brand: 'Northline',
    description: 'Low-profile canvas sneakers built for daily comfort with a durable rubber sole.',
    price: 899000, category: 'accessories', stock: 54, featured: true, lowStockThreshold: 10,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80'],
    variants: [{ name: 'Size', sku: 'ACC-SN-001', options: ['39', '40', '41', '42', '43'], priceAdjustment: 0 }],
  },
  {
    name: 'Compact Mirrorless Camera', slug: 'compact-mirrorless-camera', brand: 'Lumina',
    description: 'A 24MP mirrorless camera with a compact body and fast autofocus for everyday shooting.',
    price: 8499000, category: 'workspace', stock: 7, featured: false, lowStockThreshold: 5,
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&q=80'],
    variants: [{ name: 'Kit', sku: 'WRK-CM-001', options: ['Body only', 'With 18-55mm'], priceAdjustment: 0 }],
  },
  {
    name: 'Classic Polarized Sunglasses', slug: 'classic-polarized-sunglasses', brand: 'Solstice',
    description: 'Timeless acetate frames with polarized lenses and full UV protection.',
    price: 649000, category: 'accessories', stock: 41, featured: false, lowStockThreshold: 8,
    images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=900&q=80'],
    variants: [],
  },
  {
    name: 'Commuter Backpack', slug: 'commuter-backpack', brand: 'Northline',
    description: 'Water-resistant 18L backpack with a padded laptop sleeve and organized compartments.',
    price: 1199000, category: 'accessories', stock: 23, featured: true, lowStockThreshold: 6,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80'],
    variants: [],
  },
  {
    name: 'Portable Bluetooth Speaker', slug: 'portable-bluetooth-speaker', brand: 'Sonora',
    description: 'Room-filling sound in a compact IP67 water-resistant shell with 12-hour playback.',
    price: 1299000, category: 'audio', stock: 3, featured: false, lowStockThreshold: 5,
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=900&q=80'],
    variants: [],
  },
  {
    name: 'Mechanical Keyboard', slug: 'mechanical-keyboard', brand: 'Keyforge',
    description: 'Compact 75% mechanical keyboard with hot-swappable switches and soft acoustic dampening.',
    price: 1599000, category: 'workspace', stock: 15, featured: true, lowStockThreshold: 5,
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&q=80'],
    variants: [{ name: 'Switch', sku: 'WRK-KB-001', options: ['Tactile', 'Linear'], priceAdjustment: 0 }],
  },
  {
    name: 'Ceramic Coffee Set', slug: 'ceramic-coffee-set', brand: 'Studio Home',
    description: 'Hand-finished stoneware cups in a warm matte glaze, designed for everyday rituals.',
    price: 349000, category: 'workspace', stock: 60, featured: false, lowStockThreshold: 10,
    images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900&q=80'],
    variants: [],
  },
  {
    name: 'Slim Laptop Stand', slug: 'slim-laptop-stand', brand: 'Keyforge',
    description: 'Anodized aluminium stand that lifts your laptop to a comfortable viewing height.',
    price: 529000, category: 'workspace', stock: 4, featured: false, lowStockThreshold: 5,
    images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80'],
    variants: [],
  },
];

const ensureUser = async (email, name, password, role) => {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ email, name, password, role });
    await user.save();
    return true;
  }
  return false;
};

const seed = async () => {
  await connectDatabase();

  for (const category of categories) {
    await Category.updateOne({ slug: category.slug }, { $set: category }, { upsert: true });
  }
  const categoryMap = new Map((await Category.find()).map((category) => [category.slug, category._id]));

  for (const item of products) {
    const { category: categorySlug, ...data } = item;
    const existing = await Product.findOne({ slug: data.slug });
    const payload = { ...data, category: categoryMap.get(categorySlug), available: data.stock, reserved: 0 };
    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
    } else {
      const created = await Product.create(payload);
      await StockMovement.create({
        product: created._id,
        type: 'in',
        quantity: created.stock,
        reason: 'Initial inventory seed',
        balanceAfter: created.available,
      });
    }
  }

  const adminCreated = await ensureUser(config.adminSeedEmail, 'Store Admin', config.adminSeedPassword, 'admin');
  const demoCreated = await ensureUser('customer@example.com', 'Demo Customer', 'Demo12345', 'user');
  const addresses = (await User.findOne({ email: 'customer@example.com' })).addresses;
  if (!addresses.length) {
    await User.updateOne(
      { email: 'customer@example.com' },
      {
        $push: {
          addresses: {
            label: 'Home', fullName: 'Demo Customer', phone: '081234567890',
            line1: 'Jl. Melati No. 12', city: 'Jakarta', postalCode: '12190',
            country: 'Indonesia', isDefault: true,
          },
        },
      }
    );
  }

  console.log(`Seed complete: ${products.length} products, ${categories.length} categories`);
  if (adminCreated) console.log(`Admin created: ${config.adminSeedEmail}`);
  if (demoCreated) console.log('Demo customer created: customer@example.com');
  await disconnectDatabase();
};

seed().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await disconnectDatabase();
  process.exit(1);
});
