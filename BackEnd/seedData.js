require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Movement = require('./models/Movement');
const connectDB = require('./config/db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connected to DB. Clearing existing data...');

    await User.deleteMany({});
    await Product.deleteMany({});
    await Movement.deleteMany({});

    // 1. Create a demo user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    const user = await User.create({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      businessName: 'Demo Store'
    });
    console.log('✔ Created Demo User: admin@example.com / password123');

    // 2. Create products with diverse stock levels
    const productsData = [
      { name: 'Premium Ball Pen Box',    category: 'Stationery',      sku: 'PEN-01',  quantity: 15,  reorderLevel: 20, unitPrice: 5.5  },
      { name: 'A4 Copier Paper Ream',    category: 'Office Supplies', sku: 'PAP-A4',  quantity: 45,  reorderLevel: 30, unitPrice: 4.75 },
      { name: 'Desk Organizer Deluxe',   category: 'Office',          sku: 'ORG-01',  quantity: 5,   reorderLevel: 10, unitPrice: 15   },
      { name: 'Wireless Mouse',          category: 'Electronics',     sku: 'MS-W1',   quantity: 0,   reorderLevel: 15, unitPrice: 25   },
      { name: 'Mechanical Keyboard',     category: 'Electronics',     sku: 'KB-01',   quantity: 8,   reorderLevel: 10, unitPrice: 45   },
      { name: 'Thermal Label Roll',      category: 'Packaging',       sku: 'PK-077',  quantity: 22,  reorderLevel: 15, unitPrice: 2.2  },
      { name: 'Packing Tape 2-inch',     category: 'Packaging',       sku: 'PK-101',  quantity: 35,  reorderLevel: 12, unitPrice: 1.95 },
      { name: 'Wireless Barcode Scanner',category: 'Hardware',        sku: 'HW-208',  quantity: 3,   reorderLevel: 8,  unitPrice: 32   }
    ];

    const createdProducts = [];
    for (const p of productsData) {
      const product = await Product.create({ ...p, userId: user._id });
      createdProducts.push(product);
    }
    console.log(`✔ Created ${createdProducts.length} Products.`);

    // 3. Generate 30 days of realistic OUT movement history for the AI model
    //    Each product has a distinct demand profile for varied predictions
    console.log('Generating 30-day synthetic stock movements for AI training...');

    const demandProfiles = {
      'PEN-01':  { base: 5,  trend: 0.15, noise: 2,  pattern: 'trending_up'   },  // Increasing demand
      'PAP-A4':  { base: 8,  trend: 0,    noise: 3,  pattern: 'stable'        },  // Stable high demand
      'ORG-01':  { base: 1,  trend: 0.05, noise: 1,  pattern: 'low_steady'    },  // Low but growing
      'MS-W1':   { base: 4,  trend: 0.1,  noise: 2,  pattern: 'trending_up'   },  // Popular, growing
      'KB-01':   { base: 2,  trend: 0,    noise: 1,  pattern: 'stable'        },  // Stable low demand
      'PK-077':  { base: 6,  trend: -0.05,noise: 2,  pattern: 'trending_down' },  // Declining demand
      'PK-101':  { base: 3,  trend: 0,    noise: 2,  pattern: 'weekday_heavy' },  // Higher on weekdays
      'HW-208':  { base: 1,  trend: 0.08, noise: 1,  pattern: 'sporadic'      }   // Low & spiky
    };

    let totalMovements = 0;

    for (const product of createdProducts) {
      const profile = demandProfiles[product.sku] || { base: 3, trend: 0, noise: 1, pattern: 'stable' };
      let simulatedStock = product.quantity + 200; // Start high enough in the past

      for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
        const date = new Date();
        date.setDate(date.getDate() - dayOffset);
        date.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

        const dayIndex = 30 - dayOffset; // 0 to 29
        const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

        // Calculate daily usage based on demand profile
        let usage = profile.base;

        // Apply trend (gradual increase/decrease over time)
        usage += profile.trend * dayIndex;

        // Apply pattern modifiers
        switch (profile.pattern) {
          case 'weekday_heavy':
            // 60% more on weekdays (Mon-Fri), 40% less on weekends
            usage *= (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1.6 : 0.6;
            break;
          case 'sporadic':
            // Some days have zero demand, some days have spikes
            if (Math.random() < 0.3) usage = 0;
            else if (Math.random() < 0.2) usage *= 3;
            break;
          case 'trending_up':
            // Already handled by positive trend
            break;
          case 'trending_down':
            // Already handled by negative trend
            break;
        }

        // Add random noise
        usage += (Math.random() - 0.5) * 2 * profile.noise;

        // Clamp to non-negative integer
        usage = Math.max(0, Math.round(usage));

        if (usage > 0 && simulatedStock > 0) {
          // Don't sell more than available
          const actualUsage = Math.min(usage, simulatedStock);

          const movement = new Movement({
            userId: user._id,
            productId: product._id,
            productName: product.name,
            sku: product.sku,
            type: 'OUT',
            delta: actualUsage,  // Store as positive for OUT
            previousQty: simulatedStock,
            newQty: simulatedStock - actualUsage,
            note: 'Synthetic daily sales'
          });

          // Set historical timestamps
          movement.createdAt = date;
          movement.updatedAt = date;
          await movement.save();

          simulatedStock -= actualUsage;
          totalMovements++;
        }
      }

      // Also add some IN (restock) movements to make the data realistic
      // Add 2-3 restock events spread through the 30 days
      const restockDays = [25, 15, 5]; // Days ago
      for (const dayOffset of restockDays) {
        const restockQty = Math.floor(profile.base * 7) + Math.floor(Math.random() * 10);
        const date = new Date();
        date.setDate(date.getDate() - dayOffset);
        date.setHours(9, 0, 0, 0);

        const movement = new Movement({
          userId: user._id,
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          type: 'IN',
          delta: restockQty,
          previousQty: simulatedStock,
          newQty: simulatedStock + restockQty,
          note: 'Scheduled restock'
        });

        movement.createdAt = date;
        movement.updatedAt = date;
        await movement.save();

        simulatedStock += restockQty;
        totalMovements++;
      }
    }

    console.log(`✔ Created ${totalMovements} movement records across 30 days.`);
    console.log('\n══════════════════════════════════════════');
    console.log('  ✅ Database seeded successfully!');
    console.log('  📧 Login: admin@example.com');
    console.log('  🔑 Password: password123');
    console.log('══════════════════════════════════════════\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedData();
